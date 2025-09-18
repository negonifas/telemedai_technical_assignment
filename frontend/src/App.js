import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';

function App() {
  const [uploadResult, setUploadResult] = useState(null);

  const handleUploadSuccess = (result) => {
    setUploadResult(result);
    console.log('Файл успешно загружен:', result);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Система оценки вопросов/ответов</h1>
        <p>Медицинская экспертная система</p>
      </header>
      <main className="App-main">
        <FileUpload onUploadSuccess={handleUploadSuccess} />
        
        {uploadResult && (
          <div className="upload-result">
            <h3>Результат загрузки:</h3>
            <p>✅ {uploadResult.message}</p>
            <p>📊 Обработано вопросов: {uploadResult.summary.total_questions_processed}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
