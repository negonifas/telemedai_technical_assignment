import React, { useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file) => {
    if (file && file.name.endsWith('.xlsx')) {
      uploadFile(file);
    } else {
      setMessage('Пожалуйста, выберите файл .xlsx');
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setMessage('Загружаем файл...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5001/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message} Обработано вопросов: ${result.summary.total_questions_processed}`);
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      } else {
        // Обработка детальных ошибок валидации
        let errorMessage = `❌ Ошибка: ${result.error}`;
        
        if (result.duplicate_question_ids) {
          errorMessage += `\n🔍 Дублирующиеся ID: ${result.duplicate_question_ids.join(', ')}`;
        }
        
        if (result.duplicate_rows) {
          errorMessage += `\n📍 Строки с дублями: ${result.duplicate_rows.join(', ')}`;
        }
        
        if (result.empty_rows) {
          errorMessage += `\n📍 Пустые строки: ${result.empty_rows.join(', ')}`;
        }
        
        setMessage(errorMessage);
      }
    } catch (error) {
      setMessage(`❌ Ошибка сети: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="file-upload">
      <h3>Загрузка файла</h3>
      
      <div 
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <p>📁 Перетащите .xlsx файл сюда или</p>
          <label className="file-input-label">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleInputChange}
              disabled={isUploading}
              className="file-input"
            />
            <span className="file-button">Выберите файл</span>
          </label>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {isUploading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Обрабатываем файл...</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
