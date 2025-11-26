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

  // 회원가입 폼 제출
  document.getElementById('signupForm').addEventListener('submit', handleSignup);

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

  // 교사인 경우: 운동 기록 탭 UI 설정
  if (currentUser.role === 'teacher') {
    // 학생 선택 셀렉터 표시
    const recordStudentSelector = document.getElementById('recordStudentSelector');
    if (recordStudentSelector) {
      recordStudentSelector.style.display = 'block';
    }

    // 기록 추가 버튼 숨기기
    const addRecordButton = document.querySelector('#records .btn-primary');
    if (addRecordButton) {
      addRecordButton.style.display = 'none';
    }
  }

  // 학생 목록 로드 (모든 사용자)
  await loadStudentsList();

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
  } else if (tabName === 'board') {
    loadPosts();
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
    }

    // 모든 사용자가 뱃지 탭에서 다른 학생 선택 가능
    document.getElementById('badgeStudentSelector').style.display = 'block';
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
    // 교사인 경우
    if (currentUser.role === 'teacher') {
      const studentId = document.getElementById('recordSelectedStudent')?.value;
      const thead = document.getElementById('recordsTableHead');
      const tbody = document.getElementById('recordsTableBody');

      // 학생을 선택하지 않은 경우: 담임반 명렬표 표시
      if (!studentId) {
        // 테이블 헤더 변경 (명렬표 형식)
        thead.innerHTML = `
          <tr>
            <th>순위</th>
            <th>이름</th>
            <th>최근 기록일</th>
            <th>걸음 수</th>
            <th>운동 시간 (분)</th>
            <th>칼로리</th>
            <th>거리 (km)</th>
          </tr>
        `;

        const response = await fetch(
          `${API_URL}/exercise/class-recent-records`,
          { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        if (!response.ok) throw new Error('Failed to load class records');

        const records = await response.json();

        if (records.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center">담임반 학생이 없습니다</td></tr>';
          return;
        }

        tbody.innerHTML = records.map((record, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${record.student_name}</td>
            <td>${record.date || '-'}</td>
            <td>${record.steps ? record.steps.toLocaleString() : '0'}</td>
            <td>${record.exercise_minutes || '0'}</td>
            <td>${record.calories ? record.calories.toLocaleString() : '0'}</td>
            <td>${record.distance || '0'}</td>
          </tr>
        `).join('');
        return;
      }

      // 학생을 선택한 경우: 해당 학생의 누적 운동 기록 표시
      thead.innerHTML = `
        <tr>
          <th>날짜</th>
          <th>걸음 수</th>
          <th>운동 시간 (분)</th>
          <th>칼로리</th>
          <th>거리 (km)</th>
          <th>메모</th>
        </tr>
      `;

      const response = await fetch(
        `${API_URL}/exercise/records?student_id=${studentId}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );

      if (!response.ok) throw new Error('Failed to load records');

      const records = await response.json();

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">기록이 없습니다</td></tr>';
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
        </tr>
      `).join('');
      return;
    }

    // 학생/관리자/학부모인 경우: 기존 로직
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
    const thead = document.getElementById('studentsTableHead');
    const tbody = document.getElementById('studentsTableBody');

    // 교사인 경우 테이블 헤더에 "학생관리" 열 추가
    if (currentUser.role === 'teacher') {
      thead.innerHTML = `
        <tr>
          <th>이름</th>
          <th>반</th>
          <th>학년</th>
          <th>아이디</th>
          <th class="text-center">학생관리</th>
        </tr>
      `;
    }

    if (students.length === 0) {
      const colspan = currentUser.role === 'teacher' ? '5' : '4';
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">학생이 없습니다</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(student => {
      const editButton = currentUser.role === 'teacher'
        ? `<td class="text-center"><button class="btn btn-primary btn-sm" onclick="showEditStudentModal(${student.id}, '${student.username}', '${student.name}', '${student.class_name}', ${student.grade}, '${student.email || ''}', '${student.phone || ''}')">수정</button></td>`
        : '';

      return `
        <tr>
          <td>${student.name}</td>
          <td>${student.class_name || '-'}</td>
          <td>${student.grade || '-'}</td>
          <td>${student.username}</td>
          ${editButton}
        </tr>
      `;
    }).join('');
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

// ============ 뱃지 관련 함수 ============

// 뱃지 탭 로드
async function loadBadges() {
  try {
    // 교사/관리자: 모든 학생의 뱃지 현황 표시
    if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
      document.getElementById('badgeSummaryView').style.display = 'block';
      document.getElementById('badgeDetailView').style.display = 'none';
      document.getElementById('badgeStudentSelector').style.display = 'none';
      await loadBadgeSummary();
    }
    // 학생: 자신의 뱃지 + 다른 학생 선택 가능
    else if (currentUser.role === 'student') {
      document.getElementById('badgeSummaryView').style.display = 'none';
      document.getElementById('badgeDetailView').style.display = 'block';
      document.getElementById('badgeStudentSelector').style.display = 'block';

      const selectedId = document.getElementById('badgeSelectedStudent')?.value || currentUser.id;
      await loadStudentBadgeDetail(selectedId);
    }
    // 학부모
    else {
      document.getElementById('badgeSummaryView').style.display = 'none';
      document.getElementById('badgeDetailView').style.display = 'block';
      document.getElementById('badgeStudentSelector').style.display = 'block';

      const selectedId = document.getElementById('badgeSelectedStudent')?.value;
      if (selectedId) {
        await loadStudentBadgeDetail(selectedId);
      }
    }
  } catch (error) {
    console.error('Load badges error:', error);
  }
}

// 교사용: 모든 학생 뱃지 현황
async function loadBadgeSummary() {
  try {
    const response = await fetch(`${API_URL}/badges/summary`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load badge summary');

    const summary = await response.json();
    const tbody = document.getElementById('badgeSummaryTableBody');

    if (summary.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">학생이 없습니다</td></tr>';
      return;
    }

    tbody.innerHTML = summary.map(student => {
      const icons = student.badge_icons ? student.badge_icons.split(',').slice(0, 10).join(' ') : '';
      return `
        <tr onclick="showStudentBadgeDetail(${student.student_id})">
          <td>${student.student_name}</td>
          <td>${student.class_name || '-'}</td>
          <td><strong>${student.badge_count || 0}</strong></td>
          <td class="badge-icons">${icons}${student.badge_count > 10 ? '...' : ''}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Load badge summary error:', error);
  }
}

// 학생 이름 클릭 시 상세 보기
async function showStudentBadgeDetail(studentId) {
  document.getElementById('badgeSummaryView').style.display = 'none';
  document.getElementById('badgeDetailView').style.display = 'block';

  // 뒤로 가기 버튼 추가
  const h2 = document.querySelector('#badges h2');
  if (!document.getElementById('backToBadgeSummary')) {
    const backBtn = document.createElement('button');
    backBtn.id = 'backToBadgeSummary';
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = '← 목록으로';
    backBtn.onclick = () => {
      document.getElementById('badgeSummaryView').style.display = 'block';
      document.getElementById('badgeDetailView').style.display = 'none';
      backBtn.remove();
    };
    h2.appendChild(backBtn);
  }

  await loadStudentBadgeDetail(studentId);
}

// 개별 학생 뱃지 상세 정보
async function loadStudentBadgeDetail(studentId) {
  try {
    // 통계 로드
    const statsResponse = await fetch(`${API_URL}/badges/student/${studentId}/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      document.getElementById('earnedBadges').textContent = stats.earned_badges || 0;
      document.getElementById('totalBadgesCount').textContent = stats.total_badges || 0;
      const completion = stats.total_badges > 0
        ? Math.round((stats.earned_badges / stats.total_badges) * 100)
        : 0;
      document.getElementById('badgeCompletion').textContent = `${completion}%`;
    }

    // 뱃지 진행 상황 로드
    const progressResponse = await fetch(`${API_URL}/badges/student/${studentId}/progress`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!progressResponse.ok) throw new Error('Failed to load badge progress');

    const badges = await progressResponse.json();
    const badgeGrid = document.getElementById('badgeGrid');

    if (badges.length === 0) {
      badgeGrid.innerHTML = '<p class="text-center">뱃지 정보가 없습니다</p>';
      return;
    }

    // 카테고리별로 그룹화
    const categories = {
      milestone: '이정표',
      streak: '연속 달성',
      steps: '걸음수',
      time: '운동 시간',
      calories: '칼로리',
      distance: '거리',
      special: '특별'
    };

    let html = '';
    for (const [categoryCode, categoryName] of Object.entries(categories)) {
      const categoryBadges = badges.filter(b => b.category === categoryCode);
      if (categoryBadges.length > 0) {
        html += `<h4 class="badge-category-title">${categoryName}</h4>`;
        html += '<div class="badge-row">';
        categoryBadges.forEach(badge => {
          const earned = badge.earned ? 'earned' : 'locked';
          const earnedDate = badge.earned_at
            ? `<div class="badge-date">획득: ${badge.earned_at.split('T')[0]}</div>`
            : '';
          html += `
            <div class="badge-item ${earned}" onclick="${badge.earned ? `celebrateBadge(event, '${badge.icon}')` : ''}">
              <div class="badge-icon">${badge.icon}</div>
              <div class="badge-name">${badge.name}</div>
              <div class="badge-desc">${badge.description}</div>
              ${earnedDate}
            </div>
          `;
        });
        html += '</div>';
      }
    }

    badgeGrid.innerHTML = html;
  } catch (error) {
    console.error('Load student badge detail error:', error);
    document.getElementById('badgeGrid').innerHTML = '<p class="text-center">뱃지 정보를 불러올 수 없습니다</p>';
  }
}

// ============ 리더보드 관련 함수 ============

let currentLeaderboardCategory = 'total';
let isLeaderboardVisible = false;

// 리더보드 토글
function toggleLeaderboard() {
  isLeaderboardVisible = !isLeaderboardVisible;
  const leaderboardView = document.getElementById('leaderboardView');
  const badgeStudentSelector = document.getElementById('badgeStudentSelector');
  const badgeSummaryView = document.getElementById('badgeSummaryView');
  const badgeDetailView = document.getElementById('badgeDetailView');
  const toggleBtn = document.getElementById('toggleLeaderboardBtn');

  if (isLeaderboardVisible) {
    leaderboardView.style.display = 'block';
    badgeStudentSelector.style.display = 'none';
    badgeSummaryView.style.display = 'none';
    badgeDetailView.style.display = 'none';
    toggleBtn.textContent = '← 뱃지 보기';
    loadLeaderboard('total');
  } else {
    leaderboardView.style.display = 'none';
    toggleBtn.textContent = '🏆 리더보드 보기';
    loadBadges();
  }
}

// 리더보드 카테고리 전환
function switchLeaderboardCategory(category) {
  currentLeaderboardCategory = category;

  // 탭 활성화 상태 변경
  document.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`).classList.add('active');

  loadLeaderboard(category);
}

// 리더보드 데이터 로드
async function loadLeaderboard(category) {
  try {
    let url = `${API_URL}/leaderboard`;
    let headerText = '총점';

    if (category !== 'total') {
      url = `${API_URL}/leaderboard/category/${category}`;

      const headers = {
        badges: '뱃지 수',
        steps: '총 걸음수',
        minutes: '총 운동시간 (분)',
        calories: '총 칼로리',
        distance: '총 거리 (km)'
      };
      headerText = headers[category];
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load leaderboard');

    const data = await response.json();
    document.getElementById('leaderboardValueHeader').textContent = headerText;

    const tbody = document.getElementById('leaderboardTableBody');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">데이터가 없습니다</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(student => {
      const isCurrentUser = currentUser && student.id === currentUser.id;
      const rowClass = isCurrentUser ? 'highlight-row' : '';

      let value;
      if (category === 'total') {
        value = `${student.scores.total.toLocaleString()}점`;
      } else {
        value = student.value.toLocaleString();
        if (category === 'distance') {
          value += 'km';
        } else if (category === 'minutes') {
          value += '분';
        }
      }

      const medal = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : '';

      return `
        <tr class="${rowClass}">
          <td><strong>${medal} ${student.rank}</strong></td>
          <td>${student.name}</td>
          <td>${student.class_name || '-'}</td>
          <td><strong>${value}</strong></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Load leaderboard error:', error);
    document.getElementById('leaderboardTableBody').innerHTML =
      '<tr><td colspan="4" class="text-center">리더보드를 불러올 수 없습니다</td></tr>';
  }
}

// ============ 뱃지 클릭 이펙트 ============

function celebrateBadge(event, icon) {
  const badge = event.currentTarget;

  // 반짝임 효과
  badge.classList.add('badge-clicked');
  setTimeout(() => {
    badge.classList.remove('badge-clicked');
  }, 600);

  // 파티클 효과
  const particles = ['✨', '⭐', '💫', '🌟', icon];
  const rect = badge.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'badge-particle';
    particle.textContent = particles[Math.floor(Math.random() * particles.length)];

    const angle = (Math.PI * 2 * i) / 8;
    const distance = 50 + Math.random() * 50;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';

    document.body.appendChild(particle);

    // 애니메이션 시작
    setTimeout(() => {
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
    }, 10);

    // 제거
    setTimeout(() => {
      particle.remove();
    }, 1000);
  }
}

// ============ 회원가입 관련 함수 ============

// 회원가입 모달 열기
function showSignupModal() {
  document.getElementById('signupModal').style.display = 'block';
}

// 회원가입 모달 닫기
function closeSignupModal() {
  document.getElementById('signupModal').style.display = 'none';
  document.getElementById('signupForm').reset();
}

// 회원가입 처리
async function handleSignup(e) {
  e.preventDefault();

  const school = document.getElementById('signupSchool').value.trim();
  const gradeValue = document.getElementById('signupGrade').value;
  const classValue = document.getElementById('signupClass').value;
  const numberValue = document.getElementById('signupNumber').value;
  const name = document.getElementById('signupName').value.trim();
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
  const email = document.getElementById('signupEmail').value.trim();
  const privacyAgree = document.getElementById('privacyAgree').checked;

  // 유효성 검사 - 빈 값 체크
  if (!school) {
    alert('학교 이름을 입력해주세요.');
    return;
  }

  if (!school.includes('초등학교')) {
    alert('학교 이름은 "OO초등학교" 형식으로 입력해주세요.');
    return;
  }

  if (!gradeValue || gradeValue === '') {
    alert('학년을 선택해주세요.');
    return;
  }

  if (!classValue || classValue === '') {
    alert('반을 입력해주세요.');
    return;
  }

  if (!numberValue || numberValue === '') {
    alert('번호를 입력해주세요.');
    return;
  }

  if (!name) {
    alert('이름을 입력해주세요.');
    return;
  }

  if (!password) {
    alert('비밀번호를 입력해주세요.');
    return;
  }

  if (password.length < 4) {
    alert('비밀번호는 최소 4자 이상이어야 합니다.');
    return;
  }

  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }

  if (!privacyAgree) {
    alert('개인정보 수집 및 이용에 동의해야 합니다.');
    return;
  }

  // 숫자 변환
  const grade = parseInt(gradeValue);
  const classNum = parseInt(classValue);
  const number = parseInt(numberValue);

  // 숫자 유효성 검사
  if (isNaN(grade) || grade < 1 || grade > 6) {
    alert('올바른 학년을 선택해주세요.');
    return;
  }

  if (isNaN(classNum) || classNum < 1 || classNum > 20) {
    alert('올바른 반을 입력해주세요 (1-20).');
    return;
  }

  if (isNaN(number) || number < 1 || number > 40) {
    alert('올바른 번호를 입력해주세요 (1-40).');
    return;
  }

  // class_name 생성
  const className = `${classNum}반`;

  // 디버깅: 전송할 데이터 확인
  const requestData = {
    password: password,
    role: 'student',
    name: name,
    class_name: className,
    grade: grade,
    email: email || null
  };

  console.log('회원가입 요청 데이터:', {
    ...requestData,
    password: '****' // 비밀번호는 숨김
  });

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('회원가입 실패:', data);
      alert(`회원가입에 실패했습니다\n\n오류: ${data.error || '알 수 없는 오류'}`);
      return;
    }

    alert(`회원가입이 완료되었습니다!\n\n아이디: ${data.username}\n\n이 아이디로 로그인하세요.`);
    closeSignupModal();

    // 로그인 폼에 아이디 자동 입력
    document.getElementById('username').value = data.username;
    document.getElementById('password').focus();

  } catch (error) {
    console.error('Signup error:', error);
    alert('회원가입 중 오류가 발생했습니다');
  }
}

// 학생 정보 수정 모달 열기
function showEditStudentModal(id, username, name, class_name, grade, email, phone) {
  document.getElementById('editStudentId').value = id;
  document.getElementById('editStudentUsername').value = username;
  document.getElementById('editStudentName').value = name;
  document.getElementById('editStudentGrade').value = grade;

  // 반 정보에서 숫자만 추출 (예: "1반" -> 1)
  const classNumber = class_name ? class_name.replace('반', '') : '';
  document.getElementById('editStudentClass').value = classNumber;

  document.getElementById('editStudentEmail').value = email;
  document.getElementById('editStudentPhone').value = phone;

  document.getElementById('editStudentModal').style.display = 'block';
}

// 학생 정보 수정 모달 닫기
function closeEditStudentModal() {
  document.getElementById('editStudentModal').style.display = 'none';
  document.getElementById('editStudentForm').reset();
}

// 학생 정보 수정 처리
async function handleEditStudent(e) {
  e.preventDefault();

  const studentId = document.getElementById('editStudentId').value;
  const name = document.getElementById('editStudentName').value.trim();
  const grade = parseInt(document.getElementById('editStudentGrade').value);
  const classNum = parseInt(document.getElementById('editStudentClass').value);
  const email = document.getElementById('editStudentEmail').value.trim();
  const phone = document.getElementById('editStudentPhone').value.trim();

  // 유효성 검사
  if (!name) {
    alert('이름을 입력해주세요.');
    return;
  }

  if (isNaN(grade) || grade < 1 || grade > 6) {
    alert('올바른 학년을 선택해주세요.');
    return;
  }

  if (isNaN(classNum) || classNum < 1 || classNum > 20) {
    alert('올바른 반을 입력해주세요 (1-20).');
    return;
  }

  const class_name = `${classNum}반`;

  try {
    const response = await fetch(`${API_URL}/users/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name,
        class_name,
        grade,
        email: email || null,
        phone: phone || null
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(`학생 정보 수정에 실패했습니다\n\n오류: ${data.error || '알 수 없는 오류'}`);
      return;
    }

    alert('학생 정보가 수정되었습니다');
    closeEditStudentModal();

    // 학생 목록 새로고침
    await loadStudents();
  } catch (error) {
    console.error('Edit student error:', error);
    alert('학생 정보 수정 중 오류가 발생했습니다');
  }
}

// 학생 정보 수정 폼 이벤트 리스너 등록
document.getElementById('editStudentForm').addEventListener('submit', handleEditStudent);

// 교사 회원가입 모달 열기
function showTeacherSignupModal() {
  document.getElementById('teacherSignupModal').style.display = 'block';
}

// 교사 회원가입 모달 닫기
function closeTeacherSignupModal() {
  document.getElementById('teacherSignupModal').style.display = 'none';
  document.getElementById('teacherSignupForm').reset();
}

// 교사 회원가입 처리
async function handleTeacherSignup(e) {
  e.preventDefault();

  const school = document.getElementById('teacherSignupSchool').value.trim();
  const gradeValue = document.getElementById('teacherSignupGrade').value;
  const classValue = document.getElementById('teacherSignupClass').value;
  const name = document.getElementById('teacherSignupName').value.trim();
  const password = document.getElementById('teacherSignupPassword').value;
  const passwordConfirm = document.getElementById('teacherSignupPasswordConfirm').value;
  const email = document.getElementById('teacherSignupEmail').value.trim();
  const privacyAgree = document.getElementById('teacherPrivacyAgree').checked;

  // 유효성 검사
  if (!school) {
    alert('학교 이름을 입력해주세요.');
    return;
  }

  if (!school.includes('초등학교')) {
    alert('학교 이름은 "OO초등학교" 형식으로 입력해주세요.');
    return;
  }

  if (!gradeValue || gradeValue === '') {
    alert('담당 학년을 선택해주세요.');
    return;
  }

  if (!classValue || classValue === '') {
    alert('담임 반을 입력해주세요.');
    return;
  }

  if (!name) {
    alert('이름을 입력해주세요.');
    return;
  }

  if (!password) {
    alert('비밀번호를 입력해주세요.');
    return;
  }

  if (password.length < 4) {
    alert('비밀번호는 최소 4자 이상이어야 합니다.');
    return;
  }

  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }

  if (!privacyAgree) {
    alert('개인정보 수집 및 이용에 동의해야 합니다.');
    return;
  }

  // 숫자 변환
  const grade = parseInt(gradeValue);
  const classNum = parseInt(classValue);

  // 숫자 유효성 검사
  if (isNaN(grade) || grade < 1 || grade > 6) {
    alert('올바른 학년을 선택해주세요.');
    return;
  }

  if (isNaN(classNum) || classNum < 1 || classNum > 20) {
    alert('올바른 반을 입력해주세요 (1-20).');
    return;
  }

  // class_name 생성
  const className = `${classNum}반`;

  const requestData = {
    password: password,
    role: 'teacher',
    name: name,
    class_name: className,
    grade: grade,
    email: email || null
  };

  console.log('교사 회원가입 요청 데이터:', {
    ...requestData,
    password: '****'
  });

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('교사 회원가입 실패:', data);
      alert(`회원가입에 실패했습니다\n\n오류: ${data.error || '알 수 없는 오류'}`);
      return;
    }

    alert(`교사 회원가입이 완료되었습니다!\n\n아이디: ${data.username}\n\n이 아이디로 로그인하세요.`);
    closeTeacherSignupModal();

    // 로그인 폼에 아이디 자동 입력
    document.getElementById('username').value = data.username;
    document.getElementById('password').focus();

  } catch (error) {
    console.error('Teacher signup error:', error);
    alert('회원가입 중 오류가 발생했습니다');
  }
}

// 학부모 회원가입 모달 열기
function showParentSignupModal() {
  document.getElementById('parentSignupModal').style.display = 'block';
}

// 학부모 회원가입 모달 닫기
function closeParentSignupModal() {
  document.getElementById('parentSignupModal').style.display = 'none';
  document.getElementById('parentSignupForm').reset();
}

// 학부모 회원가입 처리
async function handleParentSignup(e) {
  e.preventDefault();

  const name = document.getElementById('parentSignupName').value.trim();
  const password = document.getElementById('parentSignupPassword').value;
  const passwordConfirm = document.getElementById('parentSignupPasswordConfirm').value;
  const email = document.getElementById('parentSignupEmail').value.trim();
  const childName = document.getElementById('parentSignupChildName').value.trim();
  const childSchool = document.getElementById('parentSignupChildSchool').value.trim();
  const childGradeValue = document.getElementById('parentSignupChildGrade').value;
  const childClassValue = document.getElementById('parentSignupChildClass').value;
  const privacyAgree = document.getElementById('parentPrivacyAgree').checked;
  const childDataAgree = document.getElementById('parentChildDataAgree').checked;

  // 유효성 검사
  if (!name) {
    alert('학부모 이름을 입력해주세요.');
    return;
  }

  if (!password) {
    alert('비밀번호를 입력해주세요.');
    return;
  }

  if (password.length < 4) {
    alert('비밀번호는 최소 4자 이상이어야 합니다.');
    return;
  }

  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }

  if (!childName) {
    alert('자녀 이름을 입력해주세요.');
    return;
  }

  if (!childSchool) {
    alert('자녀 학교 이름을 입력해주세요.');
    return;
  }

  if (!childSchool.includes('초등학교')) {
    alert('학교 이름은 "OO초등학교" 형식으로 입력해주세요.');
    return;
  }

  if (!childGradeValue || childGradeValue === '') {
    alert('자녀 학년을 선택해주세요.');
    return;
  }

  if (!childClassValue || childClassValue === '') {
    alert('자녀 반을 입력해주세요.');
    return;
  }

  if (!privacyAgree) {
    alert('개인정보 수집 및 이용에 동의해야 합니다.');
    return;
  }

  if (!childDataAgree) {
    alert('자녀의 운동정보 수집 및 조회에 동의해야 합니다.');
    return;
  }

  // 숫자 변환
  const childGrade = parseInt(childGradeValue);
  const childClassNum = parseInt(childClassValue);

  // 숫자 유효성 검사
  if (isNaN(childGrade) || childGrade < 1 || childGrade > 6) {
    alert('올바른 학년을 선택해주세요.');
    return;
  }

  if (isNaN(childClassNum) || childClassNum < 1 || childClassNum > 20) {
    alert('올바른 반을 입력해주세요 (1-20).');
    return;
  }

  const requestData = {
    password: password,
    role: 'parent',
    name: name,
    email: email || null,
    child_name: childName,
    child_grade: childGrade,
    child_class: `${childClassNum}반`
  };

  console.log('학부모 회원가입 요청 데이터:', {
    ...requestData,
    password: '****'
  });

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('학부모 회원가입 실패:', data);
      alert(`회원가입에 실패했습니다\n\n오류: ${data.error || '알 수 없는 오류'}`);
      return;
    }

    alert(`학부모 회원가입이 완료되었습니다!\n\n아이디: ${data.username}\n\n이 아이디로 로그인하세요.\n\n자녀 "${childName}" 학생을 찾아 부모-자녀 관계를 설정하려면 관리자에게 문의하세요.`);
    closeParentSignupModal();

    // 로그인 폼에 아이디 자동 입력
    document.getElementById('username').value = data.username;
    document.getElementById('password').focus();

  } catch (error) {
    console.error('Parent signup error:', error);
    alert('회원가입 중 오류가 발생했습니다');
  }
}

// 교사 회원가입 폼 이벤트 리스너 등록
document.getElementById('teacherSignupForm').addEventListener('submit', handleTeacherSignup);

// 학부모 회원가입 폼 이벤트 리스너 등록
document.getElementById('parentSignupForm').addEventListener('submit', handleParentSignup);

// ==================== 런런톡 게시판 기능 ====================

// 역할별 이모티콘 반환
function getRoleIcon(role) {
  const icons = {
    student: '🎒',
    teacher: '👨‍🏫',
    parent: '👪',
    admin: '⚙️'
  };
  return icons[role] || '👤';
}

// 날짜 포맷팅
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// 전역 변수로 현재 보고 있는 게시글 ID 저장
let currentPostId = null;

// 게시글 목록 로드
async function loadPosts() {
  try {
    const response = await fetch(`${API_URL}/board/posts`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load posts');

    const data = await response.json();
    const postsList = document.getElementById('postsList');

    if (!data.posts || data.posts.length === 0) {
      postsList.innerHTML = '<p class="text-center empty-message">아직 작성된 게시글이 없습니다.</p>';
      return;
    }

    postsList.innerHTML = data.posts.map(post => `
      <div class="post-item" onclick="viewPost(${post.id})">
        <div class="post-item-header">
          <h3 class="post-item-title">${escapeHtml(post.title)}</h3>
        </div>
        <div class="post-item-content">${escapeHtml(post.content)}</div>
        <div class="post-item-footer">
          <div class="post-item-meta">
            <span class="post-author">
              <span class="role-icon">${getRoleIcon(post.author_role)}</span>
              ${escapeHtml(post.author_name)}
            </span>
            <span>${formatDate(post.created_at)}</span>
          </div>
          <span class="comment-count">💬 ${post.comment_count}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading posts:', error);
    document.getElementById('postsList').innerHTML = '<p class="text-center empty-message">게시글을 불러오는데 실패했습니다.</p>';
  }
}

// HTML 이스케이프 함수
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 게시글 상세 보기
async function viewPost(postId) {
  currentPostId = postId;

  try {
    const response = await fetch(`${API_URL}/board/posts/${postId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load post');

    const data = await response.json();
    const post = data.post;
    const comments = data.comments;

    // 게시글 내용 채우기
    document.getElementById('detailPostTitle').textContent = post.title;
    document.getElementById('detailPostAuthor').innerHTML = `
      <span class="role-icon">${getRoleIcon(post.author_role)}</span>
      ${post.author_name}
    `;
    document.getElementById('detailPostDate').textContent = formatDate(post.created_at);
    document.getElementById('detailPostContent').textContent = post.content;

    // 작성자 본인이거나 관리자인 경우 수정/삭제 버튼 표시
    const postActions = document.getElementById('postActions');
    if (currentUser.id === post.user_id || currentUser.role === 'admin') {
      postActions.style.display = 'flex';
    } else {
      postActions.style.display = 'none';
    }

    // 댓글 표시
    displayComments(comments);

    // 모달 열기
    document.getElementById('postDetailModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading post:', error);
    alert('게시글을 불러오는데 실패했습니다.');
  }
}

// 댓글 표시
function displayComments(comments) {
  const commentsList = document.getElementById('commentsList');
  const commentCount = document.getElementById('commentCount');

  commentCount.textContent = comments.length;

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = '<p class="text-center empty-message">댓글이 없습니다</p>';
    return;
  }

  commentsList.innerHTML = comments.map(comment => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author">
          <span class="role-icon">${getRoleIcon(comment.author_role)}</span>
          ${escapeHtml(comment.author_name)}
        </span>
        <div>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
          ${currentUser.id === comment.user_id || currentUser.role === 'admin' ?
            `<button class="btn btn-danger btn-sm" onclick="deleteComment(${comment.id})" style="margin-left: 10px;">삭제</button>` :
            ''}
        </div>
      </div>
      <div class="comment-content">${escapeHtml(comment.content)}</div>
    </div>
  `).join('');
}

// 게시글 작성 모달 열기
function showCreatePostModal() {
  document.getElementById('createPostModal').style.display = 'block';
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
}

// 게시글 작성 모달 닫기
function closeCreatePostModal() {
  document.getElementById('createPostModal').style.display = 'none';
}

// 게시글 상세 모달 닫기
function closePostDetailModal() {
  document.getElementById('postDetailModal').style.display = 'none';
  currentPostId = null;
}

// 게시글 수정 모달 열기
function editPost() {
  const title = document.getElementById('detailPostTitle').textContent;
  const content = document.getElementById('detailPostContent').textContent;

  document.getElementById('editPostId').value = currentPostId;
  document.getElementById('editPostTitle').value = title;
  document.getElementById('editPostContent').value = content;

  closePostDetailModal();
  document.getElementById('editPostModal').style.display = 'block';
}

// 게시글 수정 모달 닫기
function closeEditPostModal() {
  document.getElementById('editPostModal').style.display = 'none';
}

// 게시글 작성
document.getElementById('createPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('postTitle').value;
  const content = document.getElementById('postContent').value;

  try {
    const response = await fetch(`${API_URL}/board/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, content })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || '게시글 작성에 실패했습니다.');
      return;
    }

    alert('게시글이 작성되었습니다!');
    closeCreatePostModal();
    loadPosts();
  } catch (error) {
    console.error('Error creating post:', error);
    alert('게시글 작성 중 오류가 발생했습니다.');
  }
});

// 게시글 수정
document.getElementById('editPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const postId = document.getElementById('editPostId').value;
  const title = document.getElementById('editPostTitle').value;
  const content = document.getElementById('editPostContent').value;

  try {
    const response = await fetch(`${API_URL}/board/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, content })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || '게시글 수정에 실패했습니다.');
      return;
    }

    alert('게시글이 수정되었습니다!');
    closeEditPostModal();
    loadPosts();
  } catch (error) {
    console.error('Error updating post:', error);
    alert('게시글 수정 중 오류가 발생했습니다.');
  }
});

// 게시글 삭제
async function deletePost() {
  if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/board/posts/${currentPostId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || '게시글 삭제에 실패했습니다.');
      return;
    }

    alert('게시글이 삭제되었습니다.');
    closePostDetailModal();
    loadPosts();
  } catch (error) {
    console.error('Error deleting post:', error);
    alert('게시글 삭제 중 오류가 발생했습니다.');
  }
}

// 댓글 작성
async function addComment() {
  const content = document.getElementById('commentContent').value.trim();

  if (!content) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/board/posts/${currentPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ content })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || '댓글 작성에 실패했습니다.');
      return;
    }

    // 댓글 입력창 초기화
    document.getElementById('commentContent').value = '';

    // 게시글 다시 로드하여 댓글 목록 업데이트
    viewPost(currentPostId);
  } catch (error) {
    console.error('Error adding comment:', error);
    alert('댓글 작성 중 오류가 발생했습니다.');
  }
}

// 댓글 삭제
async function deleteComment(commentId) {
  if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/board/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || '댓글 삭제에 실패했습니다.');
      return;
    }

    // 게시글 다시 로드하여 댓글 목록 업데이트
    viewPost(currentPostId);
  } catch (error) {
    console.error('Error deleting comment:', error);
    alert('댓글 삭제 중 오류가 발생했습니다.');
  }
}
