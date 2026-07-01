import { useState } from 'preact/hooks';
import { Page } from '../types';

function getInitialPage(): Page {
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'alerts') return 'alerts';
  return 'home';
}

export function useRouting() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [captureMediaId, setCaptureMediaId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('act') === 'capture') {
      return params.get('mediaId');
    }
    return null;
  });

  return { currentPage, setCurrentPage, captureMediaId, setCaptureMediaId };
}
