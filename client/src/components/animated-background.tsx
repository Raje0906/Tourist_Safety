export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 animated-bg -z-10">
      {/* Floating Particles */}
      <div className="floating-particle w-3 h-3 top-20 left-1/4 animate-float" style={{ animationDelay: "0s" }}></div>
      <div className="floating-particle w-2 h-2 top-40 right-1/3 animate-float" style={{ animationDelay: "2s" }}></div>
      <div className="floating-particle w-4 h-4 bottom-32 left-1/2 animate-float" style={{ animationDelay: "4s" }}></div>
      <div className="floating-particle w-1 h-1 top-60 right-1/4 animate-float" style={{ animationDelay: "1s" }}></div>
      <div className="floating-particle w-3 h-3 bottom-20 right-1/2 animate-float" style={{ animationDelay: "3s" }}></div>
      <div className="floating-particle w-2 h-2 top-1/3 left-3/4 animate-float" style={{ animationDelay: "5s" }}></div>
      <div className="floating-particle w-1 h-1 bottom-1/4 left-1/3 animate-float" style={{ animationDelay: "2.5s" }}></div>
      <div className="floating-particle w-3 h-3 top-3/4 right-2/3 animate-float" style={{ animationDelay: "1.5s" }}></div>
    </div>
  );
}
