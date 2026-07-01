import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';

interface ReflectionNotesProps {
  initialNotes?: string;
  initialAtmosphere?: string;
  initialLingeringThought?: string;
  onUpdateNotes?: (notes: string, atmosphere?: string, lingeringThought?: string) => void;
}

export function ReflectionNotes({
  initialNotes = "",
  initialAtmosphere = "",
  initialLingeringThought = "",
  onUpdateNotes,
}: ReflectionNotesProps) {
  const [state, setState] = useState({
    notes: initialNotes,
    atmosphere: initialAtmosphere,
    lingeringThought: initialLingeringThought
  });
  const stateRef = useRef(state);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const newState = {
      notes: initialNotes,
      atmosphere: initialAtmosphere,
      lingeringThought: initialLingeringThought
    };
    setState(newState);
    stateRef.current = newState;
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
    const newState = { ...stateRef.current, [field]: value };
    stateRef.current = newState;
    setState(newState);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onUpdateNotes?.(newState.notes, newState.atmosphere, newState.lingeringThought);
    }, 500);
  };

  const flushNotes = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
      onUpdateNotes?.(stateRef.current.notes, stateRef.current.atmosphere, stateRef.current.lingeringThought);
    }
  };

  return (
    <div className="sanctuary-detail-notes-section">
      <span className="sanctuary-detail-control-label">Private Reflections & Notes:</span>
      <textarea
        value={state.notes}
        placeholder="Record private thoughts, directorial motifs, or memorable sequences..."
        onChange={(e) => updateField('notes', e.currentTarget.value)}
        onBlur={flushNotes}
        rows={4}
        className="sanctuary-detail-input sanctuary-detail-textarea"
      />

      <div className="sanctuary-detail-metadata-inputs" >
        <div className="sanctuary-detail-input-wrap" >
          <span className="sanctuary-detail-control-label" >Atmosphere:</span>
          <input
            type="text"
            value={state.atmosphere}
            placeholder="e.g. Melancholic, Warm Amber"
            onChange={(e) => updateField('atmosphere', e.currentTarget.value)}
            onBlur={flushNotes}
            className="sanctuary-detail-input"
          />
        </div>
        <div className="sanctuary-detail-input-wrap" >
          <span className="sanctuary-detail-control-label" >Lingering Thought:</span>
          <input
            type="text"
            value={state.lingeringThought}
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
