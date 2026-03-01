import ChatClient from './chat-client';

export function generateStaticParams() {
  return [{ id: 'new' }]; // return a dummy id for static generation
}

export default function Page() {
  return <ChatClient />;
}
