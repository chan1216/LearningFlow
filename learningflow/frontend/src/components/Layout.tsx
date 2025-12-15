import Navbar from "./Navbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="text-center py-4 text-sm text-white/50">
        <p>&copy; 2025 LearningFlow. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
