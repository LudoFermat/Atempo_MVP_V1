import { Role } from '@atempo/shared';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Session = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
};

type Screen = 'LOGIN' | 'ONBOARDING' | 'HOME' | 'CHECKIN' | 'CHAT';

const apiBase = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('LOGIN');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('athlete1@atempo.dev');
  const [password, setPassword] = useState('password123');

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [goalText, setGoalText] = useState('');

  const [homeSummary, setHomeSummary] = useState<any>(null);
  const [mood, setMood] = useState('7');
  const [stress, setStress] = useState('4');
  const [checkinNote, setCheckinNote] = useState('');

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');

  const authHeader = useMemo(() => {
    if (!session) return {};
    return { Authorization: `Bearer ${session.accessToken}` };
  }, [session]);

  useEffect(() => {
    if (!session || screen === 'LOGIN') return;
    if (screen === 'HOME') {
      void loadHome();
    }
    if (screen === 'CHAT') {
      void loadChat();
    }
  }, [session, screen]);

  async function request(path: string, options: RequestInit = {}) {
    if (!session) {
      throw new Error('Session missing');
    }

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(options.headers ?? {})
      }
    });

    if (response.status !== 401) {
      return response;
    }

    const refreshResponse = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });

    if (!refreshResponse.ok) {
      setSession(null);
      setScreen('LOGIN');
      throw new Error('Session expired');
    }

    const refreshed = await refreshResponse.json();
    const nextSession = { ...session, ...refreshed };
    setSession(nextSession);

    return fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nextSession.accessToken}`,
        ...(options.headers ?? {})
      }
    });
  }

  async function onLogin() {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        Alert.alert('Error', 'Credenciales invalidas');
        return;
      }

      const payload = await response.json();
      if (payload.user.role !== Role.ATHLETE) {
        Alert.alert('Error', 'Mobile MVP solo permite ATHLETE');
        return;
      }

      setSession(payload);

      const meResponse = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${payload.accessToken}` }
      });

      if (!meResponse.ok) {
        Alert.alert('Error', 'No se pudo validar la sesion con la API');
        return;
      }

      const mePayload = await meResponse.json();

      setScreen(mePayload.profileStatus === 'NEEDS_ONBOARDING' ? 'ONBOARDING' : 'HOME');
    } catch {
      Alert.alert('Error', `No se pudo conectar con la API (${apiBase})`);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitOnboarding() {
    if (!session) return;

    const response = await request('/athlete/onboarding', {
      method: 'POST',
      body: JSON.stringify({ name, sport, goalText })
    });

    if (!response.ok) {
      Alert.alert('Error', 'No se pudo guardar onboarding');
      return;
    }

    setScreen('HOME');
  }

  async function loadHome() {
    if (!session) return;
    const response = await request('/athlete/home');
    const payload = await response.json();
    setHomeSummary(payload);
  }

  async function createCheckin() {
    const moodValue = Number(mood);
    const stressValue = Number(stress);

    const response = await request('/athlete/checkins', {
      method: 'POST',
      body: JSON.stringify({ moodScore: moodValue, stressScore: stressValue, noteText: checkinNote })
    });

    if (!response.ok) {
      Alert.alert('Error', 'Check-in invalido (valores 1-10)');
      return;
    }

    setCheckinNote('');
    setScreen('HOME');
    await loadHome();
  }

  async function loadChat() {
    const response = await request('/athlete/chat');
    const payload = await response.json();
    setChatMessages(payload);
  }

  async function sendChatMessage() {
    if (!chatText.trim()) return;

    const response = await request('/athlete/chat', {
      method: 'POST',
      body: JSON.stringify({ text: chatText })
    });

    if (!response.ok) {
      Alert.alert('Error', 'No se pudo enviar mensaje');
      return;
    }

    setChatText('');
    await loadChat();
  }

  function logout() {
    setSession(null);
    setScreen('LOGIN');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {screen === 'LOGIN' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Atempo Athlete Login</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button title={loading ? 'Entrando...' : 'Entrar'} onPress={onLogin} />
        </View>
      ) : null}

      {screen === 'ONBOARDING' ? (
        <ScrollView contentContainerStyle={styles.card}>
          <Text style={styles.title}>Onboarding</Text>
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Sport" value={sport} onChangeText={setSport} />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Goal"
            value={goalText}
            onChangeText={setGoalText}
            multiline
          />
          <Button title="Guardar" onPress={onSubmitOnboarding} />
        </ScrollView>
      ) : null}

      {screen === 'HOME' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.text}>Mood: {homeSummary?.latestCheckin?.moodScore ?? '-'}</Text>
          <Text style={styles.text}>Stress: {homeSummary?.latestCheckin?.stressScore ?? '-'}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={() => setScreen('CHECKIN')}>
              <Text style={styles.buttonText}>Nuevo check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setScreen('CHAT')}>
              <Text style={styles.buttonText}>Chat IA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonSecondary} onPress={logout}>
              <Text style={styles.buttonText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {screen === 'CHECKIN' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Nuevo check-in</Text>
          <TextInput style={styles.input} value={mood} onChangeText={setMood} keyboardType="numeric" placeholder="Mood 1-10" />
          <TextInput
            style={styles.input}
            value={stress}
            onChangeText={setStress}
            keyboardType="numeric"
            placeholder="Stress 1-10"
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={checkinNote}
            onChangeText={setCheckinNote}
            placeholder="Nota opcional"
            multiline
          />
          <Button title="Guardar check-in" onPress={createCheckin} />
          <Button title="Volver" onPress={() => setScreen('HOME')} />
        </View>
      ) : null}

      {screen === 'CHAT' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Chat IA (stub)</Text>
          <ScrollView style={styles.chatList}>
            {chatMessages.map((msg) => (
              <Text key={msg.id} style={styles.text}>
                [{msg.sender}] {msg.text}
              </Text>
            ))}
          </ScrollView>
          <TextInput style={styles.input} value={chatText} onChangeText={setChatText} placeholder="Escribe un mensaje" />
          <Button title="Enviar" onPress={sendChatMessage} />
          <Button title="Volver" onPress={() => setScreen('HOME')} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginTop: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  text: {
    fontSize: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  actions: {
    gap: 8
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonSecondary: {
    backgroundColor: '#64748b',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  chatList: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8
  }
});
