import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import SafeVoyageLogo from "@/components/safe-voyage-logo";
import ScrollReveal from "@/components/ScrollReveal";
import ShinyText from "@/components/ShinyText";
import SplitText from "@/components/SplitText";
import { 
  Shield, 
  Users, 
  MapPin, 
  Headphones,
  AlertTriangle,
  Download,
  Play,
  ChevronDown,
  Star,
  CheckCircle,
  Phone,
  Globe,
  Clock
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Background images array
  const backgroundImages = [
    '/pexels-jimmy-teoh-294331-1010640.jpg',
    '/pexels-pixabay-358457.jpg', 
    '/pexels-thelazyartist-1302991.jpg'
  ];

  // Auto-rotate background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  const handleAnimationComplete = () => {
    console.log('All letters have animated!');
  };

  const handleGetStarted = () => {
    setLocation("/login");
  };

  const features = [
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: "Emergency SOS",
      description: "One-tap emergency alerts to authorities and trusted contacts with precise location data."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Trusted Contacts",
      description: "Keep your loved ones informed with automatic location sharing and check-ins."
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Real-Time Location",
      description: "Live GPS tracking with geofencing alerts for safe zones and high-risk areas."
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: "24/7 Support Network",
      description: "Access to local emergency services and support wherever you travel."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Digital Safety ID",
      description: "Secure blockchain-verified identity with emergency medical information."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Create Your Profile",
      description: "Set up your safety profile with emergency contacts and medical information.",
      image: "📱"
    },
    {
      step: "2", 
      title: "Enable Location Tracking",
      description: "Allow real-time GPS tracking for continuous safety monitoring.",
      image: "📍"
    },
    {
      step: "3",
      title: "Travel with Confidence",
      description: "Get instant alerts, emergency support, and peace of mind wherever you go.",
      image: "✈️"
    }
  ];

  const testimonials = [
    {
      text: "SafeVoyage gave me peace of mind during my solo trip to Southeast Asia. The real-time tracking and emergency features are incredible.",
      author: "Sarah Johnson",
      role: "Solo Traveler",
      rating: 5
    },
    {
      text: "As a business traveler, I rely on SafeVoyage to keep my family informed of my whereabouts. The app is intuitive and reliable.",
      author: "Michael Chen", 
      role: "Business Traveler",
      rating: 5
    },
    {
      text: "The emergency SOS feature potentially saved my life during a hiking incident. I can't recommend SafeVoyage enough.",
      author: "Emma Rodriguez",
      role: "Adventure Traveler", 
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "How does the emergency SOS feature work?",
      answer: "With one tap, SafeVoyage sends your exact location and emergency alert to local authorities, your trusted contacts, and our 24/7 support team. The system works even with limited connectivity."
    },
    {
      question: "Is my location data secure and private?",
      answer: "Yes, we use end-to-end encryption and blockchain technology to secure your data. You control who can see your location and when. We never sell or share your personal information."
    },
    {
      question: "Does SafeVoyage work internationally?",
      answer: "SafeVoyage works in over 150 countries worldwide. We have partnerships with local emergency services and provide 24/7 multilingual support."
    },
    {
      question: "What happens if I don't have internet connection?",
      answer: "SafeVoyage works offline for emergency features. Your location data is stored locally and synced when connectivity is restored. Emergency alerts can be sent via SMS when available."
    },
    {
      question: "How much does SafeVoyage cost?",
      answer: "SafeVoyage offers a free basic plan with essential safety features. Premium plans start at $9.99/month and include advanced features like AI threat detection and priority support."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-white/95 backdrop-blur-sm p-1.5 rounded-lg shadow-xl border border-white/40 flex items-center justify-center w-12 h-12">
                <SafeVoyageLogo size={42} />
              </div>
              <span className="text-2xl font-bold text-white drop-shadow-lg">SafeVoyage</span>
            </div>
            <div className="hidden md:flex items-center space-x-10">
              <a href="#features" className="text-white/90 hover:text-white transition-colors text-lg font-medium drop-shadow-sm">Features</a>
              <a href="#how-it-works" className="text-white/90 hover:text-white transition-colors text-lg font-medium drop-shadow-sm">How It Works</a>
              <a href="#testimonials" className="text-white/90 hover:text-white transition-colors text-lg font-medium drop-shadow-sm">Reviews</a>
              <a href="#faq" className="text-white/90 hover:text-white transition-colors text-lg font-medium drop-shadow-sm">FAQ</a>
              <Button 
                onClick={handleGetStarted}
                className="bg-orange-500/90 hover:bg-orange-600 text-white font-semibold px-8 py-3 text-lg backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image Slideshow */}
        <div className="absolute inset-0">
          {backgroundImages.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url('${image}')`
              }}
            />
          ))}
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <SplitText
            text="Security That Travels With You."
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white"
            delay={100}
            duration={0.8}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
            tag="h1"
            onLetterAnimationComplete={handleAnimationComplete}
          />
          <ShinyText 
            text="Emergency alerts, live GPS tracking, Geo-Fencing, support network—all in one app. Travel with confidence knowing help is always within reach."
            disabled={false}
            speed={3}
            className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto"
          />
          
          {/* Test ScrollReveal in Hero */}
          <div className="mb-8">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={20}
              blurStrength={25}
              textClassName="text-orange-400 text-2xl font-bold"
            >
              Experience the future of travel safety
            </ScrollReveal>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 text-lg"
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-4 text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-slate-400" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={15}
              blurStrength={20}
              containerClassName="mb-8"
              textClassName="text-white"
            >
              Comprehensive Safety Features
            </ScrollReveal>
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={8}
              blurStrength={15}
              containerClassName=""
              textClassName="text-slate-300 text-xl max-w-3xl mx-auto"
            >
              Every feature designed with one goal: keeping you safe wherever your journey takes you.
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-slate-900 p-8 rounded-lg border border-slate-700 hover:border-orange-500 transition-all duration-300">
                <div className="text-orange-500 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={12}
              blurStrength={18}
              containerClassName="mb-8"
              textClassName="text-white"
            >
              How SafeVoyage Works
            </ScrollReveal>
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={6}
              blurStrength={12}
              textClassName="text-slate-300 text-xl"
            >
              Get started in three simple steps
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-orange-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.step}
                </div>
                <div className="text-4xl mb-4">{step.image}</div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="testimonials" className="py-20 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          

          {/* AI-Powered Features Section */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <ScrollReveal
                baseOpacity={0}
                enableBlur={true}
                baseRotation={8}
                blurStrength={15}
                textClassName="text-white text-3xl font-bold"
              >
                Next-Generation Safety Technology
              </ScrollReveal>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
                <div className="text-2xl mb-3">🤖</div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">AI-Powered Safety Insights</h3>
                <p className="text-slate-300 text-sm">Real-time risk detection powered by AI for accurate travel safety updates.</p>
              </div>
              
              <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
                <div className="text-2xl mb-3">🚀</div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Next-Gen Features Added Monthly</h3>
                <p className="text-slate-300 text-sm">10+ new safety and travel assistance features released in 2025.</p>
              </div>
              
              <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
                <div className="text-2xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Zero False Emergency Rate Goal</h3>
                <p className="text-slate-300 text-sm">99% accuracy in filtering false alerts with intelligent detection.</p>
              </div>
              
              <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 text-center">
                <div className="text-2xl mb-3">🌍</div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Global Readiness</h3>
                <p className="text-slate-300 text-sm">Designed to support travelers across 200+ destinations soon.</p>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="text-center mb-16">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={3}
              blurStrength={7}
              containerClassName=""
              textClassName="text-white"
            >
              Trusted by Travelers & Developers
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-slate-900 p-8 rounded-lg border border-slate-700">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-slate-400 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={6}
              blurStrength={12}
              containerClassName="mb-8"
              textClassName="text-white"
            >
              See SafeVoyage in Action
            </ScrollReveal>
            <ScrollReveal
              baseOpacity={0.2}
              enableBlur={true}
              baseRotation={2}
              blurStrength={5}
              textClassName="text-slate-300 text-xl"
            >
              Intuitive design meets powerful safety features
            </ScrollReveal>
          </div>
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <p className="text-xl text-slate-300">App Demo Video</p>
                <p className="text-slate-400">See how SafeVoyage keeps you protected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={4}
              blurStrength={9}
              textClassName="text-white"
            >
              Frequently Asked Questions
            </ScrollReveal>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-slate-900 rounded-lg border border-slate-700">
                <button
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{faq.question}</h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedFaq === index ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-300">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <ScrollReveal
            baseOpacity={0.1}
            enableBlur={true}
            baseRotation={5}
            blurStrength={8}
            containerClassName="mb-8"
            textClassName="text-white"
          >
            Ready to Travel Safely?
          </ScrollReveal>
          <ScrollReveal
            baseOpacity={0.3}
            enableBlur={true}
            baseRotation={2}
            blurStrength={4}
            containerClassName="mb-8"
            textClassName="text-white text-xl opacity-90"
          >
            Join thousands of travelers who trust SafeVoyage for their safety and peace of mind.
          </ScrollReveal>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-orange-500 hover:bg-slate-100 font-semibold px-8 py-4 text-lg"
            >
              Get Started Now
            </Button>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-orange-500">
                <Download className="w-5 h-5 mr-2" />
                App Store
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-orange-500">
                <Download className="w-5 h-5 mr-2" />
                Google Play
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <SafeVoyageLogo size={32} />
                <span className="text-xl font-bold">SafeVoyage</span>
              </div>
              <p className="text-slate-400 mb-4">
                Your trusted companion for safe travels around the world.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Globe className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Phone className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Emergency</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 SafeVoyage. All rights reserved. Travel safe, travel smart.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}