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
        return Ok(new { path, content });
    }

    [HttpPost("write")]
    public async Task<IActionResult> WriteFile([FromBody] WriteFileRequest request)
    {
        await _fileService.WriteFileAsync(request.Path, request.Content);
        return Ok(new { message = "File written successfully", path = request.Path });
    }

    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteFile([FromQuery] string path)
    {
        var deleted = await _fileService.DeleteFileAsync(path);
        return deleted ? Ok(new { message = "File deleted successfully" }) : NotFound();
    }

    [HttpGet("list")]
    public async Task<IActionResult> ListFiles([FromQuery] string directory)
    {
        var files = await _fileService.ListFilesAsync(directory);
        return Ok(new { directory, files });
    }
}

public record WriteFileRequest(string Path, string Content);