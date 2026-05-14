# Auto Annotation System

Hệ thống gán nhãn ảnh bán tự động được phát triển dựa trên CVAT và tích hợp AI model hỗ trợ annotation.

---

# Yêu cầu hệ thống

- Ubuntu 20.04+ hoặc Ubuntu 22.04+
- Git
- Docker
- Docker Compose Plugin

---

# Cài đặt Docker

Nếu máy chưa cài Docker, chạy các lệnh sau:

```bash
# Add Docker's official GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
-o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) \
signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

# Install Docker packages
sudo apt-get install -y \
docker-ce \
docker-ce-cli \
containerd.io \
docker-buildx-plugin \
docker-compose-plugin
```

Thêm user vào docker group:

```bash
sudo groupadd docker
sudo usermod -aG docker $USER
```

Sau đó đăng xuất hoặc reboot máy để áp dụng quyền.

---

# Clone source code

```bash
git clone https://github.com/NamPham2124/auto_annotation_system.git
cd auto_annotation_system
```

---

# Hướng dẫn sử dụng

## 1. Chạy hệ thống cơ bản (không dùng AI model)

Khởi động hệ thống:

```bash
docker compose up -d
```

Tạo tài khoản quản trị:

```bash
sudo docker exec -it cvat_server \
bash -ic 'python3 ~/manage.py createsuperuser'
```

Truy cập hệ thống tại:

```text
http://localhost:8080
```

---

## 2. Chạy hệ thống với AI model

Khởi động hệ thống kèm serverless AI:

```bash
docker compose \
-f docker-compose.yml \
-f docker-compose.dev.yml \
-f components/serverless/docker-compose.serverless.yml \
up -d --build
```

Deploy AI function:

```bash
serverless/deploy_cpu.sh \
serverless/pytorch/facebookresearch/sam2.1O
```

Truy cập hệ thống tại:

```text
http://localhost:8080
```

---

# Một số lệnh hữu ích

## Kiểm tra container đang chạy

```bash
docker ps
```

## Dừng hệ thống

```bash
docker compose down
```

## Xem log hệ thống

```bash
docker compose logs -f
```

---


# Repository

[GitHub Repository](https://github.com/NamPham2124/auto_annotation_system?utm_source=chatgpt.com)
