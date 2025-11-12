# LogorFileServer

基于.NET Core的文件系统数据管理服务器，作为Loggor游戏静态Json数据编辑器客户端的本地后端管理服务器。

## 技术栈

- .NET 9.0
- ASP.NET Core Web API (RESTful)
- AspectCore框架 (AOP编程)
- xUnit (单元测试)
- Swagger/OpenAPI

## 项目结构

```
LogorFileServer/
├── src/
│   ├── LogorFileServer.Api/          # Web API项目
│   │   ├── Controllers/              # API控制器
│   │   └── Program.cs                # 应用入口
│   └── LogorFileServer.Core/         # 核心业务逻辑
│       ├── Attributes/               # AOP拦截器属性
│       ├── Interfaces/               # 接口定义
│       └── Services/                 # 服务实现
├── tests/
│   └── LogorFileServer.Tests/        # 单元测试项目
└── doc/                              # 项目文档
```

## 快速开始

### 前置要求

- .NET 9.0 SDK 或更高版本

### 运行项目

1. 克隆仓库

```bash
git clone <repository-url>
cd logor-file-server
```

2. 还原依赖

```bash
dotnet restore
```

3. 运行API服务器

```bash
dotnet run --project src/LogorFileServer.Api
```

4. 访问Swagger UI

```
https://localhost:<port>/swagger
```

### 运行测试

```bash
dotnet test
```

## API接口

### 文件操作

- `GET /api/file/read?path={path}` - 读取文件内容
- `POST /api/file/write` - 写入文件
- `DELETE /api/file/delete?path={path}` - 删除文件
- `GET /api/file/list?directory={directory}` - 列出目录文件

## AOP功能

项目使用AspectCore框架实现AOP，已配置日志拦截器用于方法调用的日志记录。

## 开发

### 添加新服务

1. 在`LogorFileServer.Core/Interfaces`中定义接口
2. 在`LogorFileServer.Core/Services`中实现服务
3. 在`Program.cs`中注册服务
4. 在`LogorFileServer.Api/Controllers`中创建控制器

### 添加AOP拦截器

1. 在`LogorFileServer.Core/Attributes`中创建拦截器属性
2. 在服务类上应用属性

## 许可证

[待定]
