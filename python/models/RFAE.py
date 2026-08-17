# ====================================================================================
# MODELO RFAE: Robust Feature AutoEncoder (RFAE)
# Authors: Jingfeng Oua, Jiawei Li, Jijun Tang, Zhiliang Xia,Shurui Dai, Yan Guo, Limin Jiang, Jijun Tan
# Expert Systems With Applications 285 (2025) 127519 
# ====================================================================================

#Parameter
# - p_data_arr: Input data array (numpy array), shape (n_samples, n_features)
# - p_label_arr_onehot: Input label array (numpy array), shape (n_samples,) (not onehot encoded)
# - datasetname: Name of the dataset (string)
# - p_key_feture_number: Number of key features to select (int)
# - p_epochs_number: Number of training epochs (int)
# - p_batch_size_value: Batch size for training (int)
# - clf: Whether to include a classifier in the model (bool, default: False)
# - p_seed: Random seed for reproducibility (int, default: 42)
# - device: Device index for computation (int, default: 0 for CPU)


# 1) Data and split

#   - Input data:
#       X ∈ R^{n×d}   (n samples, d features)
#       y ∈ R^{n}
#   - Split:
#       • Train: 90%
#       • Validation: 10%
#

# 2) Feature selection layer

#   - Trainable weights:
#       w ∈ R^{d}
#   - Positive weights:
#       w⁺ = exp(w)
#   - Top-k selection:
#       topk(w⁺) → mask ∈ {0,1}^{d}
#
#   - Two input views:
#       X1 = X ⊙ w⁺        ∈ R^{n×d}   (all features weighted)
#       X2 = X ⊙ topk(w⁺) ∈ R^{n×d}   (only k selected features)
#

# 3) Autoencoder

#   - Encoder:
#       Z1 = X1 W_e + b_e ∈ R^{n×k}
#       Z2 = X2 W_e + b_e ∈ R^{n×k}
#
#   - Decoder:
#       X̂1 = Z1 W_d + b_d ∈ R^{n×d}
#       X̂2 = Z2 W_d + b_d ∈ R^{n×d}
#

# 4) Classifier (optional)

#   - If clf = True:
#       ŷ = X̂2 W_c + b_c ∈ R^{n×C}
#

# 5) Loss function

#   L =  MSE(X, X̂1)
#      + λ1 · MSE(X, X̂2)
#      + λ2 · ||w⁺||₁
#      + λ3 · CE(ŷ, y)   (optional)
#

# 6) Dynamic window strategy

#   - The number of active features is progressively reduced:
#       d → k
#

# 7) Training

#   - Optimizer: Adam
#   - The model with the lowest validation loss is saved.
#

# 8) Final feature selection

#   - Final selection:
#       indices = top-k(exp(w))


import copy
import random as rn
import os
from torch import nn
from torch import optim
from typing import Tuple
import torch
from torch import Tensor
import numpy as np
from torch.utils.data import random_split
from torch.utils.data import Dataset, DataLoader
from .Functions import top_k_keepWeights_1


def try_gpu(i=0):  # @save
    """如果存在，则返回gpu(i)，否则返回cpu()"""
    if torch.cuda.device_count() >= i + 1:
        return torch.device(f'cuda:{i}')
    return torch.device('cpu')
# --------------------------------------------------------------------------------------------------------------------------------

def cal(p_data_arr, p_label_arr_onehot, datasetname, p_key_feture_number, p_epochs_number, p_batch_size_value, clf=False, p_seed=42, device=0):
    dev = try_gpu(device)
    
    learning_rate = 0.001
    lamda1 = 2
    lamda2 = 0.1
    lamda3 = 1
    train_ratio = 0.8


    data = p_data_arr.astype(np.float32)
    label = p_label_arr_onehot.astype(np.float32)



    feature_num = data.shape[1]
    os.environ['PYTHONHASHSEED'] = str(p_seed)
    np.random.seed(p_seed)
    rn.seed(p_seed)
    torch.manual_seed(p_seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(p_seed)


    class RFAEDataset(Dataset):
        def __init__(self, data, label):
            self.data = data  # 加载npy数据
            self.label = label

        def __getitem__(self, index):
            data = self.data[index, :]  # 读取每一个npy的数据
            label = self.label[index]
            data = torch.tensor(data)  # 转为tensor形式
            label = torch.tensor(int(label))
            return data, label

        def __len__(self):
            return self.data.shape[0]  # 返回数据的总个数

    dataset = RFAEDataset(data, label)
    total_samples = len(dataset)

    #train_samples = int(train_ratio * total_samples)
    #val_samples = int(val_ratio * total_samples)

    #train_dataset, val_dataset = random_split(dataset, [train_samples, val_samples])
    train_samples = int(train_ratio * total_samples)
    val_samples = total_samples - train_samples
    split_generator = torch.Generator().manual_seed(p_seed)
    train_dataset, val_dataset = random_split(
        dataset, [train_samples, val_samples], generator=split_generator
    )

    train_generator = torch.Generator().manual_seed(p_seed)
    train_loader = DataLoader(
        train_dataset, batch_size=p_batch_size_value, shuffle=True, generator=train_generator
    )

    # Validation order has no effect on the metric, so keep it fixed.
    val_loader = DataLoader(val_dataset, batch_size=p_batch_size_value, shuffle=False)




    class feature_selection(nn.Module):

        def __init__(self, feature_num) -> None:

            super(feature_selection, self).__init__()
            # self.k = k
            lower_bound = torch.log(torch.tensor(0.999999))
            upper_bound = torch.log(torch.tensor(1.0))

            # 初始化权重
            self.weight = torch.nn.Parameter(lower_bound + (upper_bound - lower_bound) * torch.rand(feature_num),
                                             requires_grad=True)



        def forward(self, x: Tensor, k) -> Tuple[Tensor, Tensor]:
            # Compute the ranking/mask once and reuse it for both RFAE views.
            topk = torch.zeros_like(self.weight, device=self.weight.device)
            _, idx1 = torch.sort(self.weight, descending=True)
            topk.index_fill_(0, idx1[:k], 1)

            weights = torch.exp(self.weight)
            selected_weights = topk * weights
            return x * weights, x * selected_weights

    class encoder(nn.Module):

        def __init__(self, feature_num, k):
            super(encoder, self).__init__()

            # xw+b
            self.fc1 = nn.Linear(feature_num, k)
            # self.fc2 = nn.Linear(256, 50)


        def forward(self, x):
            # x:[b, 1, 28, 28]

            # x1 = F.relu(self.fc1(x1))

            x = self.fc1(x)
            # x2 = F.relu(self.fc1(x2))

            return x

    class decoder(nn.Module):

        def __init__(self, feature_num, k):
            super(decoder, self).__init__()

            # xw+b
            self.fc1 = nn.Linear(k, feature_num)
            # self.fc2 = nn.Linear(256, 28*28)


        def forward(self, x):
            # x:[b, 1, 28, 28]

            # x1 = F.relu(self.fc1(x1))
            x = self.fc1(x)
            # x2 = F.relu(self.fc1(x2))

            return x
    class classify(nn.Module):

        def __init__(self, feature_num, output_shape):
            super(classify, self).__init__()

            # xw+b
            self.fc1 = nn.Linear(feature_num, output_shape)

            # self.fc2 = nn.Linear(feature_num, feature_num)
            #
            # self.fc3 = nn.Linear(feature_num, output_shape)
            # self.fc2 = nn.Linear(256, 28*28)


        def forward(self, x):
            # x:[b, 1, 28, 28]

            # x = torch.nn.functional.relu(self.fc1(x))
            # x = torch.nn.functional.relu(self.fc2(x))
            x = self.fc1(x)

            return x

    class FractalLoss(nn.Module):
        def __init__(self):
            super(FractalLoss, self).__init__()
            self.mse = torch.nn.MSELoss()
            self.cross_entropy = torch.nn.CrossEntropyLoss()

        def forward(self, x, output, target, y1, y2, WI, lamda1, lamda2, lamda3):
            loss = (
                self.mse(x, y1)
                + lamda1 * self.mse(x, y2)
                + lamda2 * torch.norm(torch.exp(WI), p=1)
            )
            if output is not None:
                loss = loss + lamda3 * self.cross_entropy(output, target)
            return loss

    class model(nn.Module):
        def __init__(self, feature_num, k, output_shape, clf=False):
            super(model, self).__init__()
            self.fs = feature_selection(feature_num)
            self.Encoder = encoder(feature_num, k)
            self.Decoder = decoder(feature_num, k)
            if clf:
                self.Classify = classify(feature_num, output_shape)
            self.feature_num = feature_num
            self.clf = clf
        def forward(self, x, k):
            x1, x2 = self.fs(x, k)
            y1 = self.Encoder(x1)
            y2 = self.Encoder(x2)

            out1 = self.Decoder(y1)
            out2 = self.Decoder(y2)
            if self.clf:
                output = self.Classify(out2)
            else: output = None
            return out1, out2, output

        def fit(self, train_loader, val_loader, num_epochs, learning_rate, k, lamda1, lamda2, lamda3):
            # 定义损失函数和优化器
            criterion = FractalLoss()
            optimizer = optim.Adam(self.parameters(), lr=learning_rate)
            N = num_epochs // 2
            best_val_loss = float('inf')  # 保存最佳验证集损失值
            best_state = None

            for epoch in range(num_epochs):
                if epoch < N:
                    ktemp = int(self.feature_num - (self.feature_num - k) * epoch / N)
                else:
                    ktemp = k
                train_loss, val_loss = 0, 0

                # 训练模型
                self.train()  # 切换到训练模式
                for inputs, labels in train_loader:
                    optimizer.zero_grad()
                    inputs = inputs.view(inputs.size(0), feature_num)
                    # => [b, 10]
                    #inputs = inputs.to(device=device)
                    inputs = inputs.to(dev)
                    #labels = labels.to(device=device)
                    labels = labels.to(dev)
                    # 模型前向传播
                    out1, out2, output = self(inputs, ktemp)

                    # 计算损失函数和反向传播

                    loss = criterion(inputs, output, labels, out1, out2, self.fs.weight, lamda1, lamda2, lamda3)
                    loss.backward()
                    optimizer.step()

                    train_loss += loss.item()

                # 使用验证集评估模型
                self.eval()  # 切换到评估模式
                with torch.no_grad():
                    for inputs, labels in val_loader:
                        inputs = inputs.view(inputs.size(0), feature_num)

                        #inputs = inputs.to(device=device)
                        inputs = inputs.to(dev)
                        #labels = labels.to(device=device)
                        labels = labels.to(dev)
                        out1, out2, output = self(inputs, k)
                        val_loss += criterion(inputs, output, labels, out1, out2, self.fs.weight, lamda1, lamda2, lamda3).item()

                train_loss /= len(train_loader)
                val_loss /= len(val_loader)

                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_state = copy.deepcopy(self.state_dict())
                if epoch % 100 == 0:
                    print("Epoch {}/{} : Train Loss {:.4f} / Val Loss {:.4f}".format(epoch + 1, num_epochs, train_loss,
                                                                                 val_loss))

            if best_state is not None:
                self.load_state_dict(best_state)
            return self


    label_shape = int(np.max(label)) + 1

    RFAE = model(feature_num, p_key_feture_number, label_shape, clf)
    RFAE = RFAE.to(device=dev)
    RFAE.fit(train_loader, val_loader, p_epochs_number, learning_rate, p_key_feture_number, lamda1,
                         lamda2, lamda3)

    print("Completed on " + str(p_seed) + "!")

    all_feature_scores = torch.exp(RFAE.fs.weight.data).detach().cpu().numpy()
    key_features = top_k_keepWeights_1(all_feature_scores, p_key_feture_number)
    selected_position_list = np.where(key_features > 0)[0]
    print(selected_position_list)
    return selected_position_list, all_feature_scores
