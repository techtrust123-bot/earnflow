import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

export default function PrivacyPolicy() {
  const { isDark } = useTheme()

  const sections = [
    {
      title: '1. Introduction',
      content: 'Earnflow ("we," "us," "our," or "Company") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.'
    },
    {
      title: '2. Information We Collect',
      content: 'We collect information you provide directly to us, such as when you create an account, complete your profile, or contact us. This includes your name, email address, phone number, date of birth, address, and payment information. We also automatically collect certain information about your device and how you interact with our Platform, including IP address, browser type, operating system, referring URLs, and pages visited.'
    },
    {
      title: '3. How We Use Your Information',
      content: 'We use the information we collect to: provide and maintain our services; verify your identity and prevent fraud; process payments and withdrawals; send you promotional communications (with your consent); improve and personalize your experience; comply with legal and regulatory requirements; and resolve disputes.'
    },
    {
      title: '4. Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is completely secure. While we strive to protect your personal information, we cannot guarantee its absolute security.'
    },
    {
      title: '5. Third-Party Services',
      content: 'We may share your information with third-party service providers who assist us in operating our website and conducting our business, subject to strict confidentiality agreements. These include payment processors, analytics providers, and customer support services. We do not sell your personal information to third parties for their marketing purposes.'
    },
    {
      title: '6. Cookies and Tracking',
      content: 'We use cookies, web beacons, and similar tracking technologies to enhance your experience on our Platform. You can control cookie preferences through your browser settings. However, disabling cookies may affect certain functionalities of our Platform.'
    },
    {
      title: '7. Your Rights and Choices',
      content: 'Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, delete, or port your data. To exercise these rights, please contact us using the information provided below. We will respond to your request within the timeframe required by law.'
    },
    {
      title: '8. International Data Transfers',
      content: 'Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws that differ from your home country. By using Earnflow, you consent to the transfer of your information to countries outside your country of residence.'
    },
    {
      title: '9. Children\'s Privacy',
      content: 'Our Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected such information, we will take steps to delete it promptly. If you believe we have collected information from a child under 18, please contact us immediately.'
    },
    {
      title: '10. Changes to This Privacy Policy',
      content: 'We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last Updated" date of this Privacy Policy. Your continued use of our Platform after such modifications constitutes your acceptance of the updated Privacy Policy.'
    },
    {
      title: '11. Contact Us',
      content: 'If you have questions about this Privacy Policy or our privacy practices, please contact us at support@earnflow.com. We will respond to your inquiry within 30 days.'
    },
    {
      title: '12. Data Retention',
      content: 'We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When you close your account, we will delete your personal information within 90 days, except where we are required to retain it for legal, tax, or regulatory purposes.'
    }
  ]

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-white text-slate-900'} transition-colors`}>
      <Container>
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
          className="py-16"
        >
          <motion.div
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Your privacy is important to us. Learn how we collect and use your data
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className={`${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-gray-200'} rounded-xl p-8 mb-8 transition-colors`}
          >
            <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Last updated: January 17, 2026
            </p>
            <p className={`mt-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              This Privacy Policy describes how Earnflow collects, uses, and shares your personal information when you use our website, mobile application, and related services.
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className={`${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-gray-200'} rounded-xl p-6 transition-colors hover:shadow-lg`}
              >
                <h2 className="text-xl font-bold mb-3 text-indigo-600">
                  {section.title}
                </h2>
                <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} leading-relaxed`}>
                  {section.content}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={fadeInUp}
            className={`mt-12 p-6 rounded-xl ${isDark ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border border-purple-200'} transition-colors`}
          >
            <h3 className="text-xl font-bold mb-3">Your Privacy Matters</h3>
            <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
              We take your privacy seriously and are committed to transparency in how we handle your data. If you have any concerns or questions, please don't hesitate to reach out.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Return to Home
            </Link>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  )
}
