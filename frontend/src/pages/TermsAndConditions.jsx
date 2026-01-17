import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

export default function TermsAndConditions() {
  const { isDark } = useTheme()

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing and using the Earnflow platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.'
    },
    {
      title: '2. Use License',
      content: 'Permission is granted to temporarily download one copy of the materials (information or software) on Earnflow\'s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose or for any public display; attempt to decompile, disassemble, or reverse engineer any software contained on the website; remove any copyright or other proprietary notations from the materials.'
    },
    {
      title: '3. Disclaimer',
      content: 'The materials on Earnflow\'s website are provided on an \'as is\' basis. Earnflow makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.'
    },
    {
      title: '4. Limitations',
      content: 'In no event shall Earnflow or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Earnflow\'s website, even if Earnflow or an authorized representative has been notified orally or in writing of the possibility of such damage.'
    },
    {
      title: '5. Accuracy of Materials',
      content: 'The materials appearing on Earnflow\'s website could include technical, typographical, or photographic errors. Earnflow does not warrant that any of the materials on its website are accurate, complete, or current. Earnflow may make changes to the materials contained on its website at any time without notice.'
    },
    {
      title: '6. Materials and Content',
      content: 'The materials on Earnflow\'s website are protected by copyright law and trade secret law. You may not republish, redistribute, retransmit, or otherwise show the content except as permitted by law or with the prior written permission of Earnflow.'
    },
    {
      title: '7. User Accounts',
      content: 'When you create an account on Earnflow, you are responsible for maintaining the confidentiality of your password and account. You are fully responsible for all activity that occurs under your account. You must notify Earnflow immediately of any unauthorized uses of your account or any other breaches of security.'
    },
    {
      title: '8. Task Completion',
      content: 'You agree to complete tasks honestly and accurately. Fraudulent task completion, including but not limited to fake screenshots, using bot services, or duplicate accounts, will result in immediate account suspension and forfeiture of earnings. Earnflow reserves the right to verify task completion at any time.'
    },
    {
      title: '9. Payment and Withdrawals',
      content: 'Earnflow processes payments based on verified task completions. Minimum withdrawal amounts apply. Processing times vary depending on your payment method. Earnflow reserves the right to suspend payments for accounts under investigation or with suspicious activity.'
    },
    {
      title: '10. Limitation of Liability',
      content: 'In no case shall Earnflow, its directors, officers, employees, agents, suppliers, or licensors be liable to you for any damages, losses, or costs arising from your use of or inability to use Earnflow or the materials, services, and information contained therein, even if Earnflow has been notified of the possibility of such damages.'
    },
    {
      title: '11. Modifications',
      content: 'Earnflow may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.'
    },
    {
      title: '12. Governing Law',
      content: 'These terms and conditions are governed by and construed in accordance with the laws of Nigeria, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.'
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
              Terms and Conditions
            </h1>
            <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Please read these terms carefully before using Earnflow
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
              These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User" or "you") and Earnflow ("Company," "we," "us," or "our") governing your use of our website, mobile application, and related services (collectively, the "Platform").
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
            className={`mt-12 p-6 rounded-xl ${isDark ? 'bg-indigo-900/30 border border-indigo-700/50' : 'bg-indigo-50 border border-indigo-200'} transition-colors`}
          >
            <h3 className="text-xl font-bold mb-3">Questions about these Terms?</h3>
            <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
              If you have any questions about these Terms and Conditions, please contact our support team.
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
