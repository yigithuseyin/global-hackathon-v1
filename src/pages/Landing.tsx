import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Eye, Target, Lightbulb, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-bg.jpg";
import visualIcon from "@/assets/visual-icon.jpg";
import practicalIcon from "@/assets/practical-icon.jpg";
import conceptualIcon from "@/assets/conceptual-icon.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6 bg-primary/10 px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Adaptive Learning</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Learn Smarter, Not Harder with{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                LearnMate AI
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform your study materials into personalized learning experiences that adapt to
              how you learn best. Visual aids, real-world examples, or deep concepts — all tailored
              to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate("/onboarding")}>
                Get Started Free
              </Button>
              <Button variant="outline" size="lg">
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">The Problem with Traditional Study Tools</h2>
            <p className="text-lg text-muted-foreground">
              Everyone learns differently, but most study materials treat all learners the same.
              This leads to wasted time, low retention, and frustration. What if your study
              materials could adapt to how your brain actually works?
            </p>
          </div>
        </div>
      </section>

      {/* Learning Styles */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Three Learning Styles, One Smart Solution</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              LearnMate AI identifies your learning preference and transforms your materials
              accordingly
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="shadow-glow hover:scale-105 transition-smooth border-2">
              <CardHeader>
                <div className="w-full h-40 mb-4 rounded-lg overflow-hidden">
                  <img
                    src={visualIcon}
                    alt="Visual Learning"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-6 h-6 text-primary" />
                  <CardTitle>Visual Learners</CardTitle>
                </div>
                <CardDescription>
                  Transform notes into diagrams, mind maps, and infographics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• AI-generated flowcharts</li>
                  <li>• Color-coded summaries</li>
                  <li>• Visual concept maps</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-glow hover:scale-105 transition-smooth border-2">
              <CardHeader>
                <div className="w-full h-40 mb-4 rounded-lg overflow-hidden">
                  <img
                    src={practicalIcon}
                    alt="Practical Learning"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-6 h-6 text-secondary" />
                  <CardTitle>Practical Learners</CardTitle>
                </div>
                <CardDescription>
                  Generate real-world examples and hands-on exercises
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Step-by-step examples</li>
                  <li>• Case study scenarios</li>
                  <li>• Practice problems</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-glow hover:scale-105 transition-smooth border-2">
              <CardHeader>
                <div className="w-full h-40 mb-4 rounded-lg overflow-hidden">
                  <img
                    src={conceptualIcon}
                    alt="Conceptual Learning"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-6 h-6 text-accent" />
                  <CardTitle>Conceptual Learners</CardTitle>
                </div>
                <CardDescription>
                  Deep dives into theories and underlying principles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Detailed explanations</li>
                  <li>• Theoretical frameworks</li>
                  <li>• Concept relationships</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How LearnMate AI Works</h2>
            <p className="text-lg text-muted-foreground">
              Four simple steps to personalized learning
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                icon: Brain,
                title: "Take Quiz",
                description: "Answer 5 quick questions about your learning preferences",
              },
              {
                step: "2",
                icon: Sparkles,
                title: "Upload Material",
                description: "Share your notes, slides, or PDFs",
              },
              {
                step: "3",
                icon: Zap,
                title: "AI Transforms",
                description: "Get personalized study aids in seconds",
              },
              {
                step: "4",
                icon: TrendingUp,
                title: "Learn & Improve",
                description: "System adapts based on your feedback",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4 shadow-glow">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="text-sm font-bold text-primary mb-2">Step {item.step}</div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Why Choose LearnMate AI?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-card border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle>Truly Personalized</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Unlike generic tools, LearnMate adapts to your unique learning style and
                    improves over time
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Zap className="w-6 h-6 text-success" />
                    </div>
                    <CardTitle>Instant Results</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get personalized study materials in seconds, not hours of manual note-taking
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <TrendingUp className="w-6 h-6 text-secondary" />
                    </div>
                    <CardTitle>Continuous Learning</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Feedback loop ensures the system learns what works best for you
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <CardTitle>Privacy First</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your materials stay secure. No sharing, no reselling, just better learning
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join students who are learning smarter with AI that adapts to them
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="shadow-glow"
            onClick={() => navigate("/onboarding")}
          >
            Start Your Free Assessment
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background/50 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-bold bg-gradient-primary bg-clip-text text-transparent">
              LearnMate AI
            </span>
          </div>
          <p className="text-sm">
            Personalized learning powered by AI. Learn how you learn best.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
