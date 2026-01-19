import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const floatingAnimation = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
  }
}

export default function Home() {
  const { isDark } = useTheme()

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-50' : 'bg-gradient-to-b from-white via-blue-50 to-indigo-50 text-slate-900'} transition-colors duration-300`}>
      {/* Hero Section */}
      <Container>
        <motion.section 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="pt-16 pb-20 grid gap-6 lg:grid-cols-2 items-center"
        >
          <motion.div variants={fadeInUp}>
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              Earn Money Doing Simple Social Tasks
            </motion.h1>
            <motion.p 
              className={`mt-4 text-lg sm:text-xl ${isDark ? 'text-slate-300' : 'text-gray-600'} max-w-xl`}
              variants={fadeInUp}
            >
              Follow, like, comment, repost, and complete quick micro-tasks on Twitter, Instagram, TikTok, and more. Get paid instantly without hidden fees. Join thousands of earners worldwide.
            </motion.p>

            <motion.div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4" variants={fadeInUp}>
              <Link to="/signup" className="inline-block w-full sm:w-auto text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                Get Started — Free
              </Link>
              <Link to="/tasks" className={`inline-block w-full sm:w-auto text-center px-8 py-4 rounded-lg border-2 font-semibold transition-all duration-300 ${isDark ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'}`}>
                Browse Tasks
              </Link>
            </motion.div>

            <motion.div className="mt-12 flex flex-wrap gap-4" variants={fadeInUp}>
              <motion.div 
                className={`${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} px-4 py-3 rounded-lg shadow-md backdrop-blur-sm`}
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <div className="font-bold text-indigo-600">⚡ Instant Payouts</div>
              </motion.div>
              <motion.div 
                className={`${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} px-4 py-3 rounded-lg shadow-md backdrop-blur-sm`}
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <div className="font-bold text-purple-600">🔒 Secure Withdrawals</div>
              </motion.div>
              <motion.div 
                className={`${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} px-4 py-3 rounded-lg shadow-md backdrop-blur-sm`}
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <div className="font-bold text-pink-600">🌍 Global Access</div>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="order-first lg:order-last"
            variants={floatingAnimation}
            animate="animate"
          >
            <motion.div 
              className={`${isDark ? 'bg-gradient-to-br from-indigo-900 to-slate-800 shadow-2xl shadow-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-white shadow-2xl'} rounded-2xl p-6 backdrop-blur-sm`}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <img src="/assets/preview.png" alt="app preview" className="w-full rounded-xl object-cover max-h-64 sm:max-h-96 shadow-lg" />
            </motion.div>
          </motion.div>
        </motion.section>
      </Container>

      {/* About Section */}
      <motion.section 
        className={`py-20 ${isDark ? 'bg-slate-800/50' : 'bg-white'} transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container>
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              About Earnflow
            </motion.h2>
            <motion.p 
              className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
              variants={fadeInUp}
            >
              Earnflow is a trusted platform connecting content creators and advertisers with millions of social media users worldwide. We make it simple to earn money while building your online presence.
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: '🚀', title: 'Founded in 2024', desc: 'Born from the need to make online earning accessible to everyone' },
              { icon: '👥', title: '50,000+ Users', desc: 'Join our growing community of earners across Africa and beyond' },
              { icon: '💰', title: '$2M+ Paid', desc: 'We\'ve paid millions to our users for completing tasks' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                className={`p-8 rounded-xl ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100'} text-center transition-all hover:shadow-xl`}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <h3 className="font-bold text-lg mb-2">{stat.title}</h3>
                <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{stat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </motion.section>

      {/* How It Works Section */}
      <motion.section 
        className={`py-20 ${isDark ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-gradient-to-b from-blue-50 to-white'} transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container>
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              How It Works
            </motion.h2>
            <motion.p 
              className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
              variants={fadeInUp}
            >
              Simple 3-step process to start earning
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { emoji: '🔎', title: 'Find Tasks', desc: 'Browse verified tasks from advertisers and content creators on your preferred social media platform' },
              { emoji: '✅', title: 'Complete', desc: 'Follow, like, comment, repost, subscribe or complete the task. Submit proof quickly and easily' },
              { emoji: '💸', title: 'Get Paid', desc: 'Instant credit to your Earnflow balance — withdraw to your bank account anytime, anywhere' }
            ].map((step, i) => (
              <motion.div 
                key={i}
                className={`relative p-8 rounded-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-lg transition-all`}
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
              >
                <div className={`absolute -top-4 left-4 w-8 h-8 rounded-full ${isDark ? 'bg-indigo-600' : 'bg-indigo-600'} text-white flex items-center justify-center font-bold`}>{i + 1}</div>
                <div className="text-4xl mb-4">{step.emoji}</div>
                <h3 className="font-bold text-xl mb-2">{step.title}</h3>
                <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </motion.section>

      {/* Services Section */}
      <motion.section 
        className={`py-20 ${isDark ? 'bg-slate-800/50' : 'bg-white'} transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container>
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              Our Services
            </motion.h2>
            <motion.p 
              className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
              variants={fadeInUp}
            >
              Multiple ways to earn money on your favorite platforms
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: '📱', title: 'Twitter/X Tasks', desc: 'Follow accounts, like tweets, repost content, reply to tweets, and grow your followers', color: 'from-blue-500 to-blue-600' },
              { icon: '📸', title: 'Instagram Growth', desc: 'Like posts, follow accounts, comment on photos, and boost engagement on Instagram', color: 'from-pink-500 to-rose-600' },
              { icon: '🎵', title: 'TikTok Engagement', desc: 'Like videos, follow creators, share content, and help TikTok videos go viral', color: 'from-black to-gray-800' },
              { icon: '📺', title: 'YouTube Tasks', desc: 'Watch videos, like, subscribe to channels, and leave meaningful comments', color: 'from-red-500 to-red-600' },
              { icon: '💬', title: 'Discord/Telegram', desc: 'Join communities, react to messages, invite friends, and participate in discussions', color: 'from-indigo-500 to-purple-600' },
              { icon: '🎯', title: 'Advertisement Campaigns', desc: 'Help brands grow by completing sponsored tasks and promotional campaigns', color: 'from-green-500 to-emerald-600' }
            ].map((service, i) => (
              <motion.div 
                key={i}
                className={`p-8 rounded-xl ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'} shadow-lg overflow-hidden group hover:shadow-2xl transition-all`}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                  {service.icon}
                </div>
                <h3 className="font-bold text-xl mb-2">{service.title}</h3>
                <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'} mb-4`}>{service.desc}</p>
                <div className="pt-4 border-t border-gray-200 flex items-center gap-2 text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Learn more <span>→</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </motion.section>

      {/* Additional Features */}
      <motion.section 
        className={`py-20 ${isDark ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-gradient-to-b from-indigo-50 to-white'} transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container>
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              Why Choose Earnflow?
            </motion.h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: '⚡', title: 'Lightning Fast Payouts', desc: 'Get paid instantly to your wallet. No waiting, no hidden fees.' },
              { icon: '🛡️', title: 'Secure & Safe', desc: 'Your data is encrypted and protected. We never share your information.' },
              { icon: '🌍', title: 'Global Platform', desc: 'Earn from anywhere. Support for users in 50+ countries.' },
              { icon: '📈', title: 'Track Your Earnings', desc: 'Detailed analytics and reports showing your daily, weekly, and monthly earnings.' },
              { icon: '🎁', title: 'Referral Bonuses', desc: 'Earn extra by referring friends. 10% commission on their earnings.' },
              { icon: '🤝', title: '24/7 Support', desc: 'Our friendly support team is always ready to help you.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                className="flex gap-4"
                variants={fadeInUp}
                whileHover={{ x: 5 }}
              >
                <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                  <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section 
        className={`py-20 ${isDark ? 'bg-slate-800/50' : 'bg-white'} transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container>
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              What Our Users Say
            </motion.h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { name: 'Aisha Okonkwo', role: 'Student', testimonial: 'I make ₦50,000+ monthly in my spare time. Payouts are always instant. Highly recommended!', rating: 5 },
              { name: 'Daniel Chen', role: 'Freelancer', testimonial: 'Easy tasks and clear instructions. Love the variety of tasks available. Best side hustle ever.', rating: 5 },
              { name: 'Rita Mbaka', role: 'Stay-at-home Mom', testimonial: 'Perfect for working from home. Withdrawals arrive on time. Been using for 6 months now.', rating: 5 }
            ].map((testimonial, i) => (
              <motion.div 
                key={i}
                className={`p-8 rounded-xl ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100'}`}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <span key={j}>⭐</span>
                  ))}
                </div>
                <p className={`text-lg mb-6 ${isDark ? 'text-slate-300' : 'text-gray-700'} italic`}>"{testimonial.testimonial}"</p>
                <div>
                  <div className="font-bold">{testimonial.name}</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className={`py-20 ${isDark ? 'bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-900' : 'bg-gradient-to-b from-indigo-600 to-purple-700'} transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container>
          <motion.div 
            className="text-center"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              variants={fadeInUp}
            >
              Ready to Start Earning?
            </motion.h2>
            <motion.p 
              className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Join thousands of users who are already earning on Earnflow. Sign up today and complete your first task within minutes.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" variants={fadeInUp}>
              <Link 
                to="/signup" 
                className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Create Free Account
              </Link>
              <Link 
                to="/login" 
                className="inline-block px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-indigo-600 transition-all duration-300"
              >
                Already Have Account? Login
              </Link>
            </motion.div>
          </motion.div>
        </Container>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className={`${isDark ? 'bg-slate-900 border-t border-slate-700' : 'bg-slate-50 border-t border-gray-200'} py-12 transition-colors`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Container>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp}>
              <h3 className="font-bold text-lg mb-4">Earnflow</h3>
              <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Earn money doing simple social media tasks.</p>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className={`space-y-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <li><Link to="/" className="hover:text-indigo-600">Home</Link></li>
                <li><a href="#about" className="hover:text-indigo-600">About</a></li>
                <li><a href="#services" className="hover:text-indigo-600">Services</a></li>
              </ul>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className={`space-y-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <li><a href="mailto:support@earnflow.com" className="hover:text-indigo-600">Contact Us</a></li>
                <li><a href="#" className="hover:text-indigo-600">FAQ</a></li>
                <li><Link to="/terms" className="hover:text-indigo-600">Terms</Link></li>
              </ul>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a href="https://twitter.com/earnflow" className="text-indigo-600 hover:text-purple-600 text-2xl">𝕏</a>
                <a href="https://facebook.com/earnflow" className="text-indigo-600 hover:text-purple-600 text-2xl">📘</a>
                <a href="https://instagram.com/earnflow" className="text-indigo-600 hover:text-purple-600 text-2xl">📷</a>
                <a href="https://linkedin.com/in/earnflow" className="text-indigo-600 hover:text-purple-600 text-2xl">🔗</a>
                <a href="https://tiktok.com/@earnflow" className="text-indigo-600 hover:text-purple-600 text-2xl">🎵</a>
                <a href="https://youtube.com/@earnflow" className="text-indigo-600 hover:text-purple-600 text-2xl">📺</a>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className={`border-t ${isDark ? 'border-slate-700 pt-8' : 'border-gray-200 pt-8'} text-center ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <p>© {new Date().getFullYear()} Earnflow. All rights reserved. | <Link to="/privacy" className="hover:text-indigo-600">Privacy Policy</Link> | <Link to="/terms" className="hover:text-indigo-600">Terms of Service</Link></p>
          </motion.div>
        </Container>
      </motion.footer>
    </div>
  )
}