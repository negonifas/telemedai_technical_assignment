import React, { useState, useEffect } from 'react';
import './QuestionTable.css';

const QuestionTable = ({ refreshTrigger }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5001/api/questions');
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        setError('Ошибка загрузки вопросов');
      }
    } catch (err) {
      setError(`Ошибка сети: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем вопросы при монтировании компонента и при обновлении
  useEffect(() => {
    fetchQuestions();
  }, [refreshTrigger]);

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getScoreText = (score) => {
    if (score === 1) return 'Согласен';
    if (score === 0) return 'Не согласен';
    return 'Не оценено';
  };

  const getCategoriesText = (categories) => {
    if (!categories || categories.length === 0) return 'Не назначены';
    return categories.join(', ');
  };

  if (loading) {
    return (
      <div className="table-loading">
        <div className="spinner"></div>
        <span>Загружаем вопросы...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-error">
        <p>❌ {error}</p>
        <button onClick={fetchQuestions}>Попробовать снова</button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="table-empty">
        <p>📝 Вопросы не найдены. Загрузите файл для начала работы.</p>
      </div>
    );
  }

  return (
    <div className="question-table">
      <h3>Таблица вопросов ({questions.length})</h3>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID вопроса</th>
              <th>Вопрос</th>
              <th>Ответ</th>
              <th>Оценка</th>
              <th>Категория вопроса</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td>{question.id}</td>
                <td className="text-cell">
                  <span 
                    className="text-clickable"
                    title="Кликните для просмотра полного текста"
                  >
                    {truncateText(question.question_short || question.question_text)}
                  </span>
                </td>
                <td className="text-cell">
                  <span 
                    className="text-clickable"
                    title="Кликните для просмотра полного текста"
                  >
                    {truncateText(question.answer_short || question.answer_text)}
                  </span>
                </td>
                <td className="score-cell">
                  <span className={`score-badge ${question.score !== null ? 'evaluated' : 'not-evaluated'}`}>
                    {getScoreText(question.score)}
                  </span>
                </td>
                <td className="categories-cell">
                  {getCategoriesText(question.categories)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionTable;
