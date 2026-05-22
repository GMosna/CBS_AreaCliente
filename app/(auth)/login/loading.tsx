export default function LoginLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span className="btn-spinner" style={{ width: '36px', height: '36px' }} />
    </main>
  );
}
