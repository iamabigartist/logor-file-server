using LogorFileServer.Core.Attributes;
using LogorFileServer.Core.Interfaces;

namespace LogorFileServer.Core.Services;

[LogInterceptor]
public class FileService : IFileService
{
    public async Task<string> ReadFileAsync(string path)
    {
        return await File.ReadAllTextAsync(path);
    }

    public async Task WriteFileAsync(string path, string content)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            Directory.CreateDirectory(directory);
        await File.WriteAllTextAsync(path, content);
    }

    public Task<bool> DeleteFileAsync(string path)
    {
        if (!File.Exists(path))
            return Task.FromResult(false);
        File.Delete(path);
        return Task.FromResult(true);
    }

    public Task<IEnumerable<string>> ListFilesAsync(string directory)
    {
        if (!Directory.Exists(directory))
            return Task.FromResult(Enumerable.Empty<string>());
        var files = Directory.GetFiles(directory);
        return Task.FromResult(files.AsEnumerable());
    }
}