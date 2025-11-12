using LogorFileServer.Core.Interfaces;
using LogorFileServer.Core.Services;
using Xunit;

namespace LogorFileServer.Tests;

public class FileServiceTests
{
    private readonly IFileService _fileService;
    private readonly string _testDirectory;

    public FileServiceTests()
    {
        _fileService = new FileService();
        _testDirectory = Path.Combine(Path.GetTempPath(), "LogorFileServerTests");
        Directory.CreateDirectory(_testDirectory);
    }

    [Fact]
    public async Task WriteFileAsync_CreatesFile()
    {
        var testPath = Path.Combine(_testDirectory, "test.txt");
        var content = "test content";
        
        await _fileService.WriteFileAsync(testPath, content);
        
        var exists = File.Exists(testPath);
        Assert.True(exists);
        File.Delete(testPath);
    }

    [Fact]
    public async Task ReadFileAsync_ReturnsContent()
    {
        var testPath = Path.Combine(_testDirectory, "read_test.txt");
        var content = "read test content";
        await File.WriteAllTextAsync(testPath, content);
        
        var result = await _fileService.ReadFileAsync(testPath);
        
        Assert.Equal(content, result);
        File.Delete(testPath);
    }

    [Fact]
    public async Task DeleteFileAsync_RemovesFile()
    {
        var testPath = Path.Combine(_testDirectory, "delete_test.txt");
        await File.WriteAllTextAsync(testPath, "content");
        
        var result = await _fileService.DeleteFileAsync(testPath);
        
        Assert.True(result);
        Assert.False(File.Exists(testPath));
    }

    [Fact]
    public async Task ListFilesAsync_ReturnsFiles()
    {
        var file1 = Path.Combine(_testDirectory, "file1.txt");
        var file2 = Path.Combine(_testDirectory, "file2.txt");
        await File.WriteAllTextAsync(file1, "content1");
        await File.WriteAllTextAsync(file2, "content2");
        
        var files = await _fileService.ListFilesAsync(_testDirectory);
        
        Assert.Contains(file1, files);
        Assert.Contains(file2, files);
        File.Delete(file1);
        File.Delete(file2);
    }
}