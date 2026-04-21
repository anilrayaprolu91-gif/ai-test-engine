import { useState } from 'react';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN // Store your GitHub token in .env as VITE_GITHUB_TOKEN
});

export default function App() {
  const [targetUrl, setTargetUrl] = useState('');
  const [testGoal, setTestGoal] = useState('');
  const [status, setStatus] = useState('');

  const handleGenerateAndRun = async () => {
    setStatus('Pushing to GitHub...');
    try {
      // Example: create a new file in a repo (customize as needed)
      const owner = 'anilrayaprolu91-gif';
      const repo = 'ai-test-engine';
      const path = `specs/${Date.now()}-spec.md`;
      const content = btoa(`# Test Goal\n${testGoal}\n\n# Target URL\n${targetUrl}`);
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Add test spec for ${targetUrl}`,
        content,
        committer: {
          name: 'AI Test Engine',
          email: 'ai-test-engine@example.com',
        },
        author: {
          name: 'AI Test Engine',
          email: 'ai-test-engine@example.com',
        },
      });
      setStatus('Spec pushed to GitHub!');
    } catch (err) {
      let message = '';
      if (err instanceof Error) {
        message = err.message;
      } else {
        message = String(err);
      }
      setStatus('Error: ' + message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">AI Test Engine</h1>
        <label className="block mb-4">
          <span className="text-gray-700">Target URL</span>
          <input
            type="text"
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </label>
        <label className="block mb-6">
          <span className="text-gray-700">Test Goal</span>
          <input
            type="text"
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            value={testGoal}
            onChange={e => setTestGoal(e.target.value)}
            placeholder="Describe the test objective"
          />
        </label>
        <button
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition"
          onClick={handleGenerateAndRun}
        >
          Generate & Run
        </button>
        {status && <div className="mt-4 text-center text-sm text-gray-600">{status}</div>}
      </div>
    </div>
  );
}
