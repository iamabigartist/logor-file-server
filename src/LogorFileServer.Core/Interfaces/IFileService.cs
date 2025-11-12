namespace LogorFileServer.Core.Interfaces;

public interface IFileService
{
    Task<string> ReadFileAsync(string path);
    Task WriteFileAsync(string path, string content);
    Task<bool> DeleteFileAsync(string path);
    Task<IEnumerable<string>> ListFilesAsync(string directory);
}