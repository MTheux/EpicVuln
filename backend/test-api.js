async function main() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@unisys.com', password: 'Admin@123' })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }
    const { token } = await loginRes.json();
    console.log('Got token', token.substring(0, 10) + '...');

    const data = {
        titulo: 'Teste',
        descricaoExecutiva: 'Teste',
        descricaoTecnica: 'Teste',
        criticidade: 'Alta',
        scoreCvss: 5.0,
        squad: 'App Sec',
        sistema: 'Core API',
        ativo: 'api.cred.com',
        ambiente: 'PRD',
        origem: 'Manual',
        sla: '2023-11-27T00:00:00.000Z',
        tipo: 'Aplicação',
        dataDeteccao: '2023-10-27T00:00:00.000Z',
        reincidencia: 0,
        status: 'Nova'
    };

    const vulnRes = await fetch('http://localhost:3001/api/vulnerabilities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!vulnRes.ok) {
      console.error('Create failed:', vulnRes.status, await vulnRes.text());
    } else {
      console.log('Create SUCCESS:', await vulnRes.json());
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
