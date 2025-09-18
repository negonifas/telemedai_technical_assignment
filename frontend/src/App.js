import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import QuestionTable from './components/QuestionTable';

function App() {
  const [uploadResult, setUploadResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = (result) => {
    setUploadResult(result);
    // Триггер для обновления таблицы после успешной загрузки
    setRefreshTrigger(prev => prev + 1);
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

        <QuestionTable refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}

export default App;
