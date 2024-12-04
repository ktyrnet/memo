import React from 'react';
import ReactDOM from 'react-dom/client';
import FetchData from './FetchData';

const importantTarget = ReactDOM.createRoot(
  document.querySelector(".notice .notice-inner") as HTMLElement
);
importantTarget.render(<FetchData wrapper=".notice" url="/notice/?mode=important" />);
