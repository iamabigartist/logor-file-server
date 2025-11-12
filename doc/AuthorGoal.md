# LoggorFileServer

这是一个使用.NET Core为框架，基于文件系统的数据管理服务器，它主要是作为Loggor - 游戏静态Json数据编辑器客户端的数据项目文件的本地后端管理服务器来使用。

## 技术选型

- 使用Restful Web API作为开放接口供前端调用
- 在DI基础上，使用AspectCore框架来支持AOP编程
- 使用单独测试项目来自动测试项目的各个层级功能
- 不需要如SwaggerUI等可视化API测试界面
- 使用GitHub workflow action来发布包
