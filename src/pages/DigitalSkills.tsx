import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Award, Globe, Code, Smartphone, Shield, Cloud, Palette, TrendingUp, Users, Calendar, ChevronRight, ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import SEO from "@/components/PageSEO";

const courses = [
  { icon: Code, title: "Web Development", desc: "HTML, CSS, JavaScript, React, Node.js and modern frameworks", level: "Beginner to Advanced" },
  { icon: Smartphone, title: "Mobile App Development", desc: "Build iOS and Android apps with Flutter, React Native", level: "Intermediate" },
  { icon: Cloud, title: "Cloud Computing", desc: "AWS, Azure, Google Cloud fundamentals and certifications", level: "Beginner to Advanced" },
  { icon: Shield, title: "Cybersecurity", desc: "Network security, ethical hacking, and threat prevention", level: "Intermediate to Advanced" },
  { icon: Palette, title: "UI/UX Design", desc: "Figma, Adobe XD, user research and design systems", level: "Beginner to Advanced" },
  { icon: TrendingUp, title: "Digital Marketing", desc: "SEO, social media marketing, content strategy", level: "Beginner to Intermediate" },
  { icon: Award, title: "Data Science & AI", desc: "Python, Machine Learning, Data Analysis with AI", level: "Intermediate to Advanced" },
  { icon: Globe, title: "IT Fundamentals", desc: "Computer basics, networking, hardware and software", level: "Beginner" },
];

const services = [
  { title: "IT Training", desc: "Professional tech courses with certifications" },
  { title: "Web Development", desc: "Custom websites and web applications" },
  { title: "Mobile Apps", desc: "Native and cross-platform mobile solutions" },
  { title: "IT Consultancy", desc: "Digital transformation for SMEs" },
  { title: "Internship & Placement", desc: "Job placement through our IT Agency" },
  { title: "Workspace Rental", desc: "Co-working and training spaces" },
];

const stats = [
  { num: "50+", label: "Courses" },
  { num: "1000+", label: "Target Learners" },
  { num: "500+", label: "Certifications" },
  { num: "200+", label: "Job Placements" },
];

const DigitalSkills = () => {
  return (
    <Layout>
      <SEO page="/digital-skills" />
      
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-primary to-primary" />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">
              Digital Skills & Training
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Learn Digital Skills at{" "}
              <span className="text-gradient-gold">Cyber Elias Academy</span>
            </h1>
            <p className="text-primary-foreground/80 font-body text-lg max-w-2xl mx-auto mb-8">
              From Zero to Expert, Together. Empowering Nigerians with industry-relevant tech skills, certifications, and job placement opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://cybereliasacademy.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all"
              >
                <BookOpen size={18} />
                Explore Courses
                <ExternalLink size={14} />
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 rounded-lg font-ui font-semibold text-sm hover:bg-primary-foreground/20 transition-all"
              >
                Contact Us
                <ChevronRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary py-8">
        <div className="container-narrow px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-display font-bold text-secondary mb-1">{stat.num}</div>
                <div className="text-sm font-ui text-primary-foreground/70">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading
            title="Our Courses"
            subtitle="Comprehensive training programs designed for the Nigerian market"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6 bg-card rounded-xl border border-border hover:border-secondary/30 transition-all h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                    <course.icon size={24} className="text-secondary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-3 flex-grow">{course.desc}</p>
                  <div className="pt-3 border-t border-border/50">
                    <span className="text-xs font-ui text-secondary/70">{course.level}</span>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href="https://cybereliasacademy.com.ng/programs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-secondary font-ui font-medium hover:underline"
            >
              View All Courses <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-primary/5">
        <div className="container-narrow">
          <SectionHeading
            title="Our Services"
            subtitle="Beyond training - we offer complete IT solutions"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6 bg-card rounded-xl border border-border hover:border-secondary/20 transition-all">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground font-body">{service.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-gradient-to-r from-secondary/10 to-transparent">
        <div className="container-narrow">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Start Your Tech Journey?
            </h2>
            <p className="text-muted-foreground font-body mb-8">
              Join thousands of Nigerians transforming their careers through digital skills. 
              From beginner to expert, we're here to guide you every step of the way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://cybereliasacademy.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-all"
              >
                <BookOpen size={20} />
                Get Started Today
              </a>
              <a
                href="tel:+2349058628386"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card border border-border text-foreground rounded-lg font-ui font-semibold hover:bg-secondary/10 transition-all"
              >
                <Calendar size={20} />
                Book Consultation
              </a>
            </div>
            <div className="mt-6 flex justify-center gap-6 text-sm font-ui text-muted-foreground">
              <a href="tel:+2349058628386" className="hover:text-secondary transition-colors">📱 +234 905 862 8386</a>
              <a href="tel:+2347089138631" className="hover:text-secondary transition-colors">+234 708 913 8631</a>
              <a href="mailto:info@cybereliasacademy.com.ng" className="hover:text-secondary transition-colors">✉️ info@cybereliasacademy.com.ng</a>
            </div>
          </div>
        </div>
      </section>

      {/* External Links Note */}
      <section className="py-4 bg-card border-t border-border">
        <div className="container-narrow px-4 text-center">
          <p className="text-xs text-muted-foreground font-ui">
            <a 
              href="https://cybereliasacademy.com.ng" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              Cyber Elias Academy
            </a>{" "}
            is a separate entity. This page provides information about our digital skills partner.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default DigitalSkills;
