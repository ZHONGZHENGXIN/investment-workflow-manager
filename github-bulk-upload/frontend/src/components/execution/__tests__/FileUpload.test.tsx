import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../FileUpload';

// Mock file API
const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

// Mock fetch
global.fetch = jest.fn();

describe('FileUpload', () => {
  const mockOnUpload = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: '1',
        filename: 'test.txt',
        url: '/uploads/test.txt',
      }),
    });
  });

  it('renders upload area', () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText(/拖拽文件到此处/)).toBeInTheDocument();
    expect(screen.getByText(/或点击选择文件/)).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/attachments/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith({
        id: '1',
        filename: 'test.txt',
        url: '/uploads/test.txt',
      });
    });
  });

  it('handles drag and drop', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByTestId('drop-zone');
    
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-blue-500');
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [mockFile],
      },
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('shows upload progress', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    });
    
    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByText(/上传中/)).toBeInTheDocument();
    });
  });

  it('handles upload errors', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    
    render(<FileUpload onUpload={mockOnUpload} onError={mockOnError} />);
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('validates file types', async () => {
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
    
    render(
      <FileUpload 
        onUpload={mockOnUpload} 
        onError={mockOnError}
        acceptedTypes={['image/*', 'text/*']}
      />
    );
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [invalidFile] },
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('不支持的文件类型')
      );
    });
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates file size', async () => {
    const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.txt', { 
      type: 'text/plain' 
    });
    
    render(
      <FileUpload 
        onUpload={mockOnUpload} 
        onError={mockOnError}
        maxSize={5 * 1024 * 1024} // 5MB
      />
    );
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [largeFile] },
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('文件大小超过限制')
      );
    });
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles multiple file uploads', async () => {
    const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
    
    render(<FileUpload onUpload={mockOnUpload} multiple />);
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [file1, file2] },
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows file preview for images', async () => {
    const imageFile = new File(['image content'], 'image.jpg', { type: 'image/jpeg' });
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    
    render(<FileUpload onUpload={mockOnUpload} showPreview />);
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [imageFile] },
    });
    
    await waitFor(() => {
      expect(screen.getByAltText('预览')).toBeInTheDocument();
    });
  });

  it('allows file removal before upload', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText(/选择文件/);
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    });
    
    // Wait for file to be added to queue
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByLabelText(/移除文件/);
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
  });
});