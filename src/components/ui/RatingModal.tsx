import React from 'react';
import { Star, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { cn } from '../../lib/utils';
import { useToast } from './Toast';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
  targetName: string;
}

const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, onSubmit, targetName }) => {
  const [score, setScore] = React.useState(5);
  const [comment, setComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(score, comment);
      showToast(`¡Gracias! Has calificado a ${targetName}`);
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Error al enviar calificación', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Calificar a ${targetName}`}
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1 rounded-2xl">Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            loading={isSubmitting}
            className="flex-1 bg-primary rounded-2xl"
          >
            Enviar calificación
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pt-4 pb-2">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-slate-500 font-medium">¿Cómo fue tu experiencia de viaje?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className="p-1 transition-transform active:scale-90"
              >
                <Star 
                  size={40} 
                  className={cn(
                    "transition-colors",
                    s <= score ? "text-amber-400 fill-amber-400" : "text-slate-200"
                  )} 
                />
              </button>
            ))}
          </div>
          <p className="text-xl font-black text-slate-800">
            {score === 5 ? '¡Excelente!' : score === 4 ? 'Muy bueno' : score === 3 ? 'Bueno' : score === 2 ? 'Regular' : 'Malo'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Comentario (opcional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuenta un poco más sobre el viaje..."
            className="w-full h-24 p-4 rounded-3xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 resize-none text-sm text-slate-700"
          />
        </div>
      </div>
    </Modal>
  );
};

export default RatingModal;
