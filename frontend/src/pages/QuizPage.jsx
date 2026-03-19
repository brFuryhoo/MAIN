import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { HelpCircle, Check, X, Trophy, RefreshCw, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const QuizPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchQuiz(); }, []);
  const fetchQuiz = async () => { setLoading(true); setSubmitted(false); setAnswers({}); setResult(null); try { const r = await axios.get(`${API}/ecosystem/quiz`); setQuiz(r.data); } catch {} setLoading(false); };

  const submitQuiz = async () => {
    const qs = quiz?.questions || [];
    let correct = 0;
    qs.forEach((q, i) => { if (answers[i] === q.answer) correct++; });
    try {
      const r = await axios.post(`${API}/ecosystem/quiz/submit`, { correct, total: qs.length }, { headers });
      setResult(r.data);
      setSubmitted(true);
      if (r.data.reward > 0) toast.success(`+${r.data.reward} AT earned!`);
    } catch { setSubmitted(true); setResult({ score: Math.round(correct/qs.length*100), correct, total: qs.length, reward: correct }); }
  };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="quiz-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('quiz.title')} <span className="text-gradient-gold">{t('quiz.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('quiz.desc')}</p>
          </div>
          {submitted && <Button onClick={fetchQuiz} className="aureos-btn-gold" data-testid="new-quiz-btn"><RefreshCw size={14} className="mr-2" /> {t('quiz.new')}</Button>}
        </div>

        {submitted && result && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="aureos-card p-6 text-center" data-testid="quiz-result">
            <Trophy className="mx-auto mb-3" size={36} style={{ color: result.score >= 60 ? '#CFAE46' : '#FF5252' }} />
            <p className="text-3xl font-mono font-bold" style={{ color: result.score >= 60 ? '#00E676' : '#FF9800' }}>{result.score}%</p>
            <p className="text-[#888] text-sm">{result.correct}/{result.total} {t('quiz.correct')}</p>
            <p className="text-aureos-gold text-sm mt-2 flex items-center justify-center gap-1"><Gift size={14} /> +{result.reward} {t('quiz.earned')}</p>
          </motion.div>
        )}

        <div className="space-y-4">
          {quiz?.questions?.map((q, i) => {
            const isCorrect = submitted && answers[i] === q.answer;
            const isWrong = submitted && answers[i] !== undefined && answers[i] !== q.answer;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="aureos-card p-5" data-testid={`question-${i}`}>
                <p className="text-sm font-semibold mb-3"><span className="text-aureos-gold mr-2">Q{i+1}.</span>{q.q}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[i] === oi;
                    const correct = submitted && oi === q.answer;
                    const wrong = submitted && selected && oi !== q.answer;
                    return (
                      <button key={oi} disabled={submitted} onClick={() => setAnswers(a => ({ ...a, [i]: oi }))}
                        className={`p-3 rounded-lg text-left text-xs transition-all border ${
                          correct ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' :
                          wrong ? 'bg-[#FF5252]/10 border-[#FF5252]/30 text-[#FF5252]' :
                          selected ? 'bg-aureos-gold/10 border-aureos-gold/30 text-aureos-gold' :
                          'bg-white/[0.03] border-white/5 text-[#ccc] hover:border-white/20'
                        }`} data-testid={`option-${i}-${oi}`}>
                        {correct && <Check size={12} className="inline mr-1" />}
                        {wrong && <X size={12} className="inline mr-1" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && <p className="text-[11px] text-[#888] mt-2 p-2 rounded bg-white/[0.02]">{q.explanation}</p>}
              </motion.div>
            );
          })}
        </div>

        {!submitted && (
          <Button onClick={submitQuiz} disabled={Object.keys(answers).length < (quiz?.questions?.length || 5)}
            className="aureos-btn-gold w-full" data-testid="submit-quiz-btn">
            {t('quiz.submit')}
          </Button>
        )}
      </div>
    </AureosLayout>
  );
};
export default QuizPage;
