import ChaiLoader from '@/components/ChaiLoader';

export default function Loading() {
  return (
    <ChaiLoader
      fullScreen
      label="Chaiwale Admin"
      sublabel="Syncing live operations & financial data..."
    />
  );
}
