import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

type RootRouterProps = {
  children: ReactNode;
};

export default function RootRouter({ children }: RootRouterProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
