import { Router, Route, Switch } from 'wouter';
import Nav from './components/Nav';
import ChatWidget from './components/ChatWidget';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Recommendation from './pages/Recommendation';
import Rackets from './pages/Rackets';
import Stringers from './pages/Stringers';
import Feedback from './pages/Feedback';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-court-black text-court-white font-sans">
        <Nav />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/recommendation/:runId" component={Recommendation} />
          <Route path="/rackets" component={Rackets} />
          <Route path="/stringers" component={Stringers} />
          <Route path="/feedback" component={Feedback} />
        </Switch>
        <ChatWidget />
      </div>
    </Router>
  );
}
