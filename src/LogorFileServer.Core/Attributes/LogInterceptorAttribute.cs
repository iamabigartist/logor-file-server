using AspectCore.DynamicProxy;

namespace LogorFileServer.Core.Attributes;

public class LogInterceptorAttribute : AbstractInterceptorAttribute
{
    public override async Task Invoke(AspectContext context, AspectDelegate next)
    {
        Console.WriteLine($"[LOG] Executing: {context.ServiceMethod.Name}");
        await next(context);
        Console.WriteLine($"[LOG] Executed: {context.ServiceMethod.Name}");
    }
}