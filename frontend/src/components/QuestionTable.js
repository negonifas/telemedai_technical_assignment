import React, { useState, useEffect } from 'react';
import './QuestionTable.css';
import Modal from './Modal';

const QuestionTable = ({ refreshTrigger }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'evaluated', 'unevaluated'
  const [categories, setCategories] = useState([]); // Список доступных категорий
  const [updatingQuestions, setUpdatingQuestions] = useState(new Set()); // ID вопросов в процессе обновления
  
  // Состояние модального окна
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: ''
  });

  const fetchQuestions = async (page = 1, filterType = filter) => {
    setLoading(true);
    setError('');
    
    try {
      const url = `http://localhost:5001/api/questions?page=${page}&per_page=20&filter=${filterType}`;
      const response = await fetch(url);
      
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

  // Загрузка списка категорий
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  // Обновление оценки вопроса
  const updateQuestionScore = async (questionId, score) => {
    setUpdatingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      const response = await fetch(`http://localhost:5001/api/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId ? { ...q, score } : q
          )
        );
      } else {
        throw new Error('Ошибка обновления оценки');
      }
    } catch (err) {
      setError(`Ошибка обновления: ${err.message}`);
    } finally {
      setUpdatingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  // Обновление категорий вопроса
  const updateQuestionCategories = async (questionId, categoryIds) => {
    setUpdatingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      const response = await fetch(`http://localhost:5001/api/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category_ids: categoryIds }),
      });

      if (response.ok) {
        // Обновляем локальное состояние
        const updatedCategories = categories.filter(cat => categoryIds.includes(cat.id));
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId ? { ...q, categories: updatedCategories } : q
          )
        );
      } else {
        throw new Error('Ошибка обновления категорий');
      }
    } catch (err) {
      setError(`Ошибка обновления: ${err.message}`);
    } finally {
      setUpdatingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  // Загружаем вопросы при монтировании компонента и при обновлении
  useEffect(() => {
    fetchQuestions();
    fetchCategories(); // Загружаем категории один раз при монтировании
  }, [refreshTrigger]);

  const handlePageChange = (newPage) => {
    fetchQuestions(newPage);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Сброс на первую страницу при смене фильтра
    fetchQuestions(1, newFilter);
  };

  // Функции для модального окна
  const openModal = (title, content) => {
    setModalState({
      isOpen: true,
      title,
      content
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      content: ''
    });
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
      <div className="question-table">
        <div className="table-header">
          <h3>Вопросов (0)</h3>
        </div>

        {/* Блок фильтрации - всегда видим */}
        <div className="filters">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('all')}
          >
            Все
          </button>
          <button 
            className={filter === 'evaluated' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('evaluated')}
          >
            Оцененные
          </button>
          <button 
            className={filter === 'unevaluated' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('unevaluated')}
          >
            Неоцененные
          </button>
        </div>

        <div className="table-empty">
          <p>📝 Вопросы не найдены{filter !== 'all' ? ` в категории "${filter === 'evaluated' ? 'Оцененные' : 'Неоцененные'}"` : '. Загрузите файл для начала работы'}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="question-table">
      <div className="table-header">
        <h3>Вопросов ({questions.length})</h3>
        
        {totalPages > 1 && (
          <div className="pagination-info">
            Страница {currentPage} из {totalPages}
          </div>
        )}
      </div>

      {/* Блок фильтрации */}
      <div className="filters">
        <button 
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('all')}
        >
          Все
        </button>
        <button 
          className={filter === 'evaluated' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('evaluated')}
        >
          Оцененные
        </button>
        <button 
          className={filter === 'unevaluated' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('unevaluated')}
        >
          Неоцененные
        </button>
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
                    onClick={() => openModal(
                      `Вопрос №${question.id}`, 
                      question.question_short || question.question_text || question.question
                    )}
                  >
                    {truncateText(question.question_short || question.question_text || question.question)}
                  </span>
                </td>
                <td className="text-cell">
                  <span 
                    className="text-clickable"
                    title="Кликните для просмотра полного текста"
                    onClick={() => openModal(
                      `Ответ на вопрос №${question.id}`, 
                      question.answer_short || question.answer_text || question.answer
                    )}
                  >
                    {truncateText(question.answer_short || question.answer_text || question.answer)}
                  </span>
                </td>
                <td className="score-cell">
                  {updatingQuestions.has(question.id) ? (
                    <div className="score-updating">
                      <div className="mini-spinner"></div>
                    </div>
                  ) : (
                    <div className="score-radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name={`score-${question.id}`}
                          value="1"
                          checked={question.score === 1}
                          onChange={() => updateQuestionScore(question.id, 1)}
                        />
                        <span className="radio-label">Согласен</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name={`score-${question.id}`}
                          value="0"
                          checked={question.score === 0}
                          onChange={() => updateQuestionScore(question.id, 0)}
                        />
                        <span className="radio-label">Не согласен</span>
                      </label>
                      {question.score !== null && (
                        <button
                          className="clear-score-btn"
                          onClick={() => updateQuestionScore(question.id, null)}
                          title="Сбросить оценку"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="categories-cell">
                  {updatingQuestions.has(question.id) ? (
                    <div className="categories-updating">
                      <div className="mini-spinner"></div>
                    </div>
                  ) : (
                    <div className="categories-checkboxes">
                      {categories.map(category => {
                        const isSelected = question.categories && 
                          question.categories.some(cat => cat.id === category.id);
                        
                        return (
                          <label key={category.id} className="checkbox-option">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentCategoryIds = question.categories ? 
                                  question.categories.map(cat => cat.id) : [];
                                
                                let newCategoryIds;
                                if (e.target.checked) {
                                  // Добавляем категорию
                                  newCategoryIds = [...currentCategoryIds, category.id];
                                } else {
                                  // Убираем категорию
                                  newCategoryIds = currentCategoryIds.filter(id => id !== category.id);
                                }
                                
                                updateQuestionCategories(question.id, newCategoryIds);
                              }}
                            />
                            <span className="checkbox-label">{category.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
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

      {/* Модальное окно */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        content={modalState.content}
      />
    </div>
  );
};

export default QuestionTable;
