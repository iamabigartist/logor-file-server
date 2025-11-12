using LogorFileServer.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LogorFileServer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FileController : ControllerBase
{
    private readonly IFileService _fileService;

    public FileController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpGet("read")]
    public async Task<IActionResult> ReadFile([FromQuery] string path)
    {
        var content = await _fileService.ReadFileAsync(path);
        return Ok(new ReadFileResponse(path, content));
    }

    [HttpPost("write")]
    public async Task<IActionResult> WriteFile([FromBody] WriteFileRequest request)
    {
        await _fileService.WriteFileAsync(request.Path, request.Content);
        return Ok(new WriteFileResponse("File written successfully", request.Path));
    }

    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteFile([FromQuery] string path)
    {
        var deleted = await _fileService.DeleteFileAsync(path);
        return deleted ? Ok(new DeleteFileResponse("File deleted successfully")) : NotFound();
    }

    [HttpGet("list")]
    public async Task<IActionResult> ListFiles([FromQuery] string directory)
    {
        var files = await _fileService.ListFilesAsync(directory);
        return Ok(new ListFilesResponse(directory, files));
    }

    [HttpGet("health")]
    public IActionResult HealthCheck()
    {
        return Ok(new HealthCheckResponse(
            Status: "healthy",
            Timestamp: DateTime.UtcNow,
            Service: "LogorFileServer",
            Version: "1.0.0"
        ));
    }
}

public record WriteFileRequest(string Path, string Content);
public record ReadFileResponse(string Path, string Content);
public record WriteFileResponse(string Message, string Path);
public record DeleteFileResponse(string Message);
public record ListFilesResponse(string Directory, IEnumerable<string> Files);
public record HealthCheckResponse(string Status, DateTime Timestamp, string Service, string Version);