import { ReactNode } from 'react';
import { NativeRouter } from 'react-router-native';

type RootRouterProps = {
  children: ReactNode;
};

export default function RootRouter({ children }: RootRouterProps) {
  return <NativeRouter>{children}</NativeRouter>;
}
