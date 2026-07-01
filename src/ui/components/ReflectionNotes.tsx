import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';

interface ReflectionNotesProps {
  initialNotes?: string;
  initialAtmosphere?: string;
  initialLingeringThought?: string;
  onUpdateNotes?: (notes: string, atmosphere?: string, lingeringThought?: string) => void;
}

export function ReflectionNotes({
  initialNotes = '',
  initialAtmosphere = '',
  initialLingeringThought = '',
  onUpdateNotes,
}: ReflectionNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [atmosphere, setAtmosphere] = useState(initialAtmosphere);
  const [lingeringThought, setLingeringThought] = useState(initialLingeringThought);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setNotes(initialNotes);
    setAtmosphere(initialAtmosphere);
    setLingeringThought(initialLingeringThought);
  }, [initialNotes, initialAtmosphere, initialLingeringThought]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const updateField = (
    field: 'notes' | 'atmosphere' | 'lingeringThought',
    value: string
  ) => {
    let newNotes = notes;
    let newAtmosphere = atmosphere;
    let newLingeringThought = lingeringThought;

    if (field === 'notes') {
      setNotes(value);
      newNotes = value;
    } else if (field === 'atmosphere') {
      setAtmosphere(value);
      newAtmosphere = value;
    } else if (field === 'lingeringThought') {
      setLingeringThought(value);
      newLingeringThought = value;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onUpdateNotes?.(newNotes, newAtmosphere, newLingeringThought);
    }, 500);
  };

  const flushNotes = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
      onUpdateNotes?.(notes, atmosphere, lingeringThought);
    }
  };

  return (
    <div className="sanctuary-detail-notes-section">
      <span className="sanctuary-detail-control-label">Private Reflections & Notes:</span>
      <textarea
        value={notes}
        placeholder="Record private thoughts, directorial motifs, or memorable sequences..."
        onChange={(e) => updateField('notes', e.currentTarget.value)}
        onBlur={flushNotes}
        rows={4}
        className="sanctuary-detail-input sanctuary-detail-textarea"
      />

      <div className="sanctuary-detail-metadata-inputs" style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="sanctuary-detail-input-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="sanctuary-detail-control-label" style={{ fontSize: '11px' }}>Atmosphere:</span>
          <input
            type="text"
            value={atmosphere}
            placeholder="e.g. Melancholic, Warm Amber"
            onChange={(e) => updateField('atmosphere', e.currentTarget.value)}
            onBlur={flushNotes}
            className="sanctuary-detail-input"
          />
        </div>
        <div className="sanctuary-detail-input-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="sanctuary-detail-control-label" style={{ fontSize: '11px' }}>Lingering Thought:</span>
          <input
            type="text"
            value={lingeringThought}
            placeholder="e.g. The cost of love..."
            onChange={(e) => updateField('lingeringThought', e.currentTarget.value)}
            onBlur={flushNotes}
            className="sanctuary-detail-input"
          />
        </div>
      </div>
    </div>
  );
}
