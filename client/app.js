const API_URL = 'http://localhost:3001/api';
let currentUser = null;
let authToken = null;

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', () => {
  // 저장된 토큰 확인
  authToken = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('currentUser');

  if (authToken && userStr) {
    currentUser = JSON.parse(userStr);
    showDashboard();
  }

  // 탭 전환 이벤트
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // 로그인 폼 제출
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // 기록 추가 폼 제출
  document.getElementById('addRecordForm').addEventListener('submit', handleAddRecord);

  // 오늘 날짜를 기본값으로 설정
  document.getElementById('recordDate').valueAsDate = new Date();
});

// 로그인 처리
async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || '로그인에 실패했습니다');
      return;
    }

    authToken = data.token;
    currentUser = data.user;

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showDashboard();
  } catch (error) {
    console.error('Login error:', error);
    alert('로그인 중 오류가 발생했습니다');
  }
}

// 로그아웃
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  authToken = null;
  currentUser = null;

  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('dashboardPage').classList.add('hidden');

  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// 대시보드 표시
async function showDashboard() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('dashboardPage').classList.remove('hidden');

  document.getElementById('userInfo').textContent = `${currentUser.name} (${getRoleText(currentUser.role)})`;

  // 역할에 따라 탭 표시/숨김
  const studentsTab = document.getElementById('studentsTab');
  if (currentUser.role === 'student') {
    studentsTab.style.display = 'none';
  } else {
    studentsTab.style.display = 'block';
  }

  // 학생 목록 로드 (교사, 관리자, 학부모)
  if (currentUser.role !== 'student') {
    await loadStudentsList();
  }

  switchTab('dashboard');
}

// 역할 텍스트 반환
function getRoleText(role) {
  const roles = {
    student: '학생',
    teacher: '교사',
    admin: '관리자',
    parent: '학부모'
  };
  return roles[role] || role;
}

// 탭 전환
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');

  // 탭별 데이터 로드
  if (tabName === 'dashboard') {
    loadDashboard();
  } else if (tabName === 'records') {
    loadRecords();
  } else if (tabName === 'badges') {
    loadBadges();
  } else if (tabName === 'students') {
    loadStudents();
  }
}

// 학생 목록 로드 (선택 박스용)
async function loadStudentsList() {
  try {
    const response = await fetch(`${API_URL}/users/students`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load students');

    const students = await response.json();

    // 대시보드 학생 선택
    const selector = document.getElementById('selectedStudent');
    selector.innerHTML = '<option value="">전체 학생</option>';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.class_name || '-'})`;
      selector.appendChild(option);
    });

    // 기록 탭 학생 선택
    const recordSelector = document.getElementById('recordSelectedStudent');
    recordSelector.innerHTML = '<option value="">학생을 선택하세요</option>';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.class_name || '-'})`;
      recordSelector.appendChild(option);
    });

    // 뱃지 탭 학생 선택
    const badgeSelector = document.getElementById('badgeSelectedStudent');
    badgeSelector.innerHTML = '<option value="">학생을 선택하세요</option>';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.class_name || '-'})`;
      badgeSelector.appendChild(option);
    });

    // 학생 선택기 표시
    if (currentUser.role !== 'student') {
      document.getElementById('studentSelector').style.display = 'block';
      document.getElementById('recordStudentSelector').style.display = 'block';

      // 학생은 다른 학생 선택 가능
      if (currentUser.role === 'student') {
        document.getElementById('badgeStudentSelector').style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Load students error:', error);
  }
}

// 대시보드 데이터 로드
async function loadDashboard() {
  try {
    const studentId = currentUser.role === 'student'
      ? currentUser.id
      : document.getElementById('selectedStudent')?.value;

    if (!studentId && currentUser.role !== 'student') {
      // 학생이 선택되지 않은 경우
      resetDashboard();
      return;
    }

    // 오늘 기록
    const today = new Date().toISOString().split('T')[0];
    const recordsResponse = await fetch(
      `${API_URL}/exercise/records?student_id=${studentId}&start_date=${today}&end_date=${today}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    if (recordsResponse.ok) {
      const records = await recordsResponse.json();
      if (records.length > 0) {
        const record = records[0];
        document.getElementById('todaySteps').textContent = record.steps.toLocaleString();
        document.getElementById('todayMinutes').textContent = `${record.exercise_minutes}분`;
        document.getElementById('todayCalories').textContent = `${record.calories.toLocaleString()}kcal`;
        document.getElementById('todayDistance').textContent = `${record.distance}km`;
      } else {
        resetTodayStats();
      }
    }

    // 주간 통계
    const statsResponse = await fetch(
      `${API_URL}/exercise/statistics?student_id=${studentId}&period=week`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      document.getElementById('avgSteps').textContent = Math.round(stats.avg_steps || 0).toLocaleString();
      document.getElementById('avgMinutes').textContent = `${Math.round(stats.avg_minutes || 0)}분`;
      document.getElementById('totalDays').textContent = `${stats.total_days || 0}일`;
      document.getElementById('totalCalories').textContent = `${Math.round(stats.total_calories || 0).toLocaleString()}kcal`;
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
  }
}

function resetDashboard() {
  resetTodayStats();
  document.getElementById('avgSteps').textContent = '-';
  document.getElementById('avgMinutes').textContent = '-';
  document.getElementById('totalDays').textContent = '-';
  document.getElementById('totalCalories').textContent = '-';
}

function resetTodayStats() {
  document.getElementById('todaySteps').textContent = '0';
  document.getElementById('todayMinutes').textContent = '0분';
  document.getElementById('todayCalories').textContent = '0kcal';
  document.getElementById('todayDistance').textContent = '0km';
}

// 운동 기록 로드
async function loadRecords() {
  try {
    const studentId = currentUser.role === 'student'
      ? currentUser.id
      : document.getElementById('recordSelectedStudent')?.value;

    if (!studentId) {
      document.getElementById('recordsTableBody').innerHTML =
        '<tr><td colspan="7" class="text-center">학생을 선택하세요</td></tr>';
      return;
    }

    const response = await fetch(
      `${API_URL}/exercise/records?student_id=${studentId}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    if (!response.ok) throw new Error('Failed to load records');

    const records = await response.json();
    const tbody = document.getElementById('recordsTableBody');

    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">기록이 없습니다</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(record => `
      <tr>
        <td>${record.date}</td>
        <td>${record.steps.toLocaleString()}</td>
        <td>${record.exercise_minutes}</td>
        <td>${record.calories.toLocaleString()}</td>
        <td>${record.distance}</td>
        <td>${record.notes || '-'}</td>
        <td>
          <button class="btn btn-danger" onclick="deleteRecord(${record.id})">삭제</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Load records error:', error);
  }
}

// 학생 목록 로드
async function loadStudents() {
  try {
    const response = await fetch(`${API_URL}/users/students`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load students');

    const students = await response.json();
    const tbody = document.getElementById('studentsTableBody');

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">학생이 없습니다</td></tr>';
      return;
    }

    tbody.innerHTML = students.map(student => `
      <tr>
        <td>${student.name}</td>
        <td>${student.class_name || '-'}</td>
        <td>${student.grade || '-'}</td>
        <td>${student.username}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Load students error:', error);
  }
}

// 기록 추가 모달
function showAddRecordModal() {
  document.getElementById('addRecordModal').style.display = 'block';
}

function closeAddRecordModal() {
  document.getElementById('addRecordModal').style.display = 'none';
  document.getElementById('addRecordForm').reset();
  document.getElementById('recordDate').valueAsDate = new Date();
}

// 기록 추가
async function handleAddRecord(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  // 학생 ID 설정
  if (currentUser.role === 'student') {
    data.student_id = currentUser.id;
  } else {
    data.student_id = document.getElementById('recordSelectedStudent').value;
    if (!data.student_id) {
      alert('학생을 선택하세요');
      return;
    }
  }

  try {
    const response = await fetch(`${API_URL}/exercise/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || '기록 추가에 실패했습니다');
      return;
    }

    alert('기록이 추가되었습니다');
    closeAddRecordModal();
    loadRecords();
    loadDashboard();
  } catch (error) {
    console.error('Add record error:', error);
    alert('기록 추가 중 오류가 발생했습니다');
  }
}

// 기록 삭제
async function deleteRecord(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${API_URL}/exercise/records/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const result = await response.json();
      alert(result.error || '삭제에 실패했습니다');
      return;
    }

    alert('기록이 삭제되었습니다');
    loadRecords();
    loadDashboard();
  } catch (error) {
    console.error('Delete record error:', error);
    alert('삭제 중 오류가 발생했습니다');
  }
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
  const modal = document.getElementById('addRecordModal');
  if (event.target === modal) {
    closeAddRecordModal();
  }
}
