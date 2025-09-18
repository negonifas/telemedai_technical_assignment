import React, { useState, useEffect } from 'react';
import './QuestionTable.css';

const QuestionTable = ({ refreshTrigger }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchQuestions = async (page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:5001/api/questions?page=${page}&per_page=20`);
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.total_pages || 0);
        setHasNext(data.has_next || false);
        setHasPrev(data.has_prev || false);
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
    fetchQuestions(1); // Всегда начинаем с первой страницы при обновлении
    setCurrentPage(1);
  }, [refreshTrigger]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchQuestions(newPage);
    }
  };

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
        <button onClick={() => fetchQuestions(currentPage)}>Попробовать снова</button>
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
      <div className="table-header">
        <h3>Таблица вопросов ({questions.length})</h3>
        
        {totalPages > 1 && (
          <div className="pagination-info">
            Страница {currentPage} из {totalPages}
          </div>
        )}
      </div>
      
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

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPrev}
            className="pagination-btn"
          >
            ← Назад
          </button>
          
          <span className="pagination-status">
            Страница {currentPage} из {totalPages}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNext}
            className="pagination-btn"
          >
            Вперед →
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionTable;
