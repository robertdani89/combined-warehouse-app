import { ReactNode } from 'react';
import { Platform } from 'react-native';
import { BrowserRouter } from 'react-router-dom';
import { NativeRouter } from 'react-router-native';

type RootRouterProps = {
  children: ReactNode;
};

export default function RootRouter({ children }: RootRouterProps) {
  if (Platform.OS === 'web') {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  return <NativeRouter>{children}</NativeRouter>;
}
