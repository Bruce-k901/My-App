"use client";

import { useState, useEffect } from "react";
import { Slide } from "@/data/courses/schema";
import { useCourseStore } from "@/stores/course-store";
import ReactMarkdown from "react-markdown";

interface QuizSlideProps {
  slide: Slide;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  module: string;
}

export default function QuizSlide({ slide }: QuizSlideProps) {
  const { markSlideComplete } = useCourseStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const { questionCount = 30, passPercentage = 80, randomize = true, questionBankId } = slide.quizData || {};

  // Load and randomize questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        // Import the question bank directly
        const questionBank = await import("@/data/courses/question-bank.json");
        const bankQuestions: Question[] = questionBank[questionBankId || "level2-food-safety"] || [];

        // Randomize and select questions
        let selectedQuestions = [...bankQuestions];
        if (randomize) {
          selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
        }
        selectedQuestions = selectedQuestions.slice(0, questionCount);

        setQuestions(selectedQuestions);
        setSelectedAnswers(new Array(selectedQuestions.length).fill(null));
        setLoading(false);
      } catch (error) {
        console.error("Failed to load questions:", error);
        setLoading(false);
      }
    }

    loadQuestions();
  }, [questionBankId, questionCount, randomize]);

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);

    // Auto-advance to next question after a short delay (unless it's the last question)
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 400);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });

    const percentage = (correct / questions.length) * 100;
    setScore(percentage);
    setShowResults(true);

    // Mark complete if passed
    if (percentage >= passPercentage) {
      markSlideComplete(slide.id);
    }
  };

  const handleRetry = () => {
    // Reload with new random questions
    setLoading(true);
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
    
    // Trigger reload
    async function reloadQuestions() {
      try {
        const questionBank = await import("@/data/courses/question-bank.json");
        const bankQuestions: Question[] = questionBank[questionBankId || "level2-food-safety"] || [];

        let selectedQuestions = [...bankQuestions];
        if (randomize) {
          selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
        }
        selectedQuestions = selectedQuestions.slice(0, questionCount);

        setQuestions(selectedQuestions);
        setSelectedAnswers(new Array(selectedQuestions.length).fill(null));
        setLoading(false);
      } catch (error) {
        console.error("Failed to reload questions:", error);
        setLoading(false);
      }
    }

    reloadQuestions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load questions. Please try again.</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const passed = score >= passPercentage;
    const correctCount = Math.round((score / 100) * questions.length);

    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className={`text-center p-8 rounded-lg ${passed ? "bg-green-50 border-2 border-green-500" : "bg-red-50 border-2 border-red-500"}`}>
          <div className="text-6xl mb-4">{passed ? "🎉" : "📚"}</div>
          <h2 className="text-3xl font-bold mb-4">{passed ? "Congratulations!" : "Not Quite There"}</h2>
          <p className="text-xl mb-6">
            You scored <span className="font-bold text-2xl">{score.toFixed(1)}%</span>
          </p>
          <p className="text-lg mb-6">
            {correctCount} out of {questions.length} questions correct
          </p>
          
          {passed ? (
            <div>
              <p className="text-lg mb-6 text-green-800">
                You've passed the Level 2 Food Safety assessment! Your certificate is ready.
              </p>
              <p className="text-sm text-gray-600">
                Click "Next" to view and download your certificate.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg mb-6 text-red-800">
                You need {passPercentage}% to pass. Review the course materials and try again.
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Retake Assessment
              </button>
            </div>
          )}

          {/* Review answers */}
          <div className="mt-8 text-left">
            <h3 className="text-xl font-bold mb-4">Review Your Answers:</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.map((q, index) => {
                const userAnswer = selectedAnswers[index];
                const isCorrect = userAnswer === q.correctAnswer;

                return (
                  <div key={q.id} className={`p-4 rounded-lg border-2 ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    <p className="font-semibold mb-2">
                      {index + 1}. {q.question}
                    </p>
                    <p className="text-sm mb-1">
                      Your answer: <span className={isCorrect ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                        {userAnswer !== null ? q.options[userAnswer] : "Not answered"}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="text-sm mb-1">
                        Correct answer: <span className="text-green-700 font-semibold">{q.options[q.correctAnswer]}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-700 mt-2">{q.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const allAnswered = selectedAnswers.every((answer) => answer !== null);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Safety check
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Question not found. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{slide.title}</h1>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{selectedAnswers.filter(a => a !== null).length} answered</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{currentQuestion.question}</h2>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswers[currentQuestionIndex] === index
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                  selectedAnswers[currentQuestionIndex] === index
                    ? "border-blue-600 bg-blue-600"
                    : "border-gray-400"
                }`}>
                  {selectedAnswers[currentQuestionIndex] === index && (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            Submit Assessment
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestionIndex] === null}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        )}
      </div>

      {/* Warning if not all answered */}
      {currentQuestionIndex === questions.length - 1 && !allAnswered && (
        <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
          <p className="text-yellow-800 font-semibold">
            ⚠️ Please answer all questions before submitting
          </p>
        </div>
      )}
    </div>
  );
}
