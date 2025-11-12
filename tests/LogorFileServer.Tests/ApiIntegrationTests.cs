using LogorFileServer.Api.Controllers;
using LogorFileServer.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace LogorFileServer.Tests;

public class ApiIntegrationTests
{
    private readonly Mock<IFileService> _mockFileService;
    private readonly FileController _controller;

    public ApiIntegrationTests()
    {
        _mockFileService = new Mock<IFileService>();
        _controller = new FileController(_mockFileService.Object);
    }

    [Fact]
    public void HealthCheck_ReturnsHealthyStatus()
    {
        // Act
        var result = _controller.HealthCheck();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<HealthCheckResponse>(okResult.Value);
        
        Assert.NotNull(response);
        Assert.Equal("healthy", response.Status);
        Assert.Equal("LogorFileServer", response.Service);
        Assert.Equal("1.0.0", response.Version);
        Assert.True(DateTime.UtcNow - response.Timestamp < TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task ReadFile_WithMockService_ReturnsContent()
    {
        // Arrange
        var testPath = "test.txt";
        var expectedContent = "test content";
        _mockFileService.Setup(x => x.ReadFileAsync(testPath))
                       .ReturnsAsync(expectedContent);

        // Act
        var result = await _controller.ReadFile(testPath);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ReadFileResponse>(okResult.Value);
        
        Assert.NotNull(response);
        Assert.Equal(testPath, response.Path);
        Assert.Equal(expectedContent, response.Content);
    }

    [Fact]
    public async Task WriteFile_WithMockService_ReturnsSuccess()
    {
        // Arrange
        var request = new WriteFileRequest("test.txt", "content");

        // Act
        var result = await _controller.WriteFile(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<WriteFileResponse>(okResult.Value);
        
        Assert.NotNull(response);
        Assert.Equal("File written successfully", response.Message);
        Assert.Equal(request.Path, response.Path);
        
        _mockFileService.Verify(x => x.WriteFileAsync(request.Path, request.Content), Times.Once);
    }
}