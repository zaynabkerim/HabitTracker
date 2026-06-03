import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SCREEN_WIDTH = Dimensions.get('window').width

const CATEGORIES = [
  { id: 'all', label: 'Все', emoji: '📋' },
  { id: 'health', label: 'Здоровье', emoji: '❤️' },
  { id: 'sport', label: 'Спорт', emoji: '🏃' },
  { id: 'study', label: 'Учёба', emoji: '📚' },
  { id: 'other', label: 'Другое', emoji: '✨' },
]

export default function App() {
  const [habits, setHabits] = useState([])
  const [newHabit, setNewHabit] = useState('')
  const [newCategory, setNewCategory] = useState('health')
  const [activeCategory, setActiveCategory] = useState('all')
  const [streak, setStreak] = useState(0)
  const [screen, setScreen] = useState('home')
  const [weekStats, setWeekStats] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const isLoaded = useRef(false)

  useEffect(() => {
    loadHabits()
    loadWeekStats()
  }, [])

  useEffect(() => {
    if (isLoaded.current) saveHabits()
  }, [habits])

  // ── Storage ───────────────────────────────────────────────

  const saveHabits = async () => {
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(habits))
    } catch (e) {
      console.log(e)
    }
  }

  const loadHabits = async () => {
    try {
      const savedHabits = await AsyncStorage.getItem('habits')
      const savedDate = await AsyncStorage.getItem('lastDate')
      const savedStreak = await AsyncStorage.getItem('streak')
      const today = new Date().toDateString()

      if (savedHabits !== null) {
        let parsedHabits = JSON.parse(savedHabits)

        // Добавляем поле category старым привычкам если его нет
        parsedHabits = parsedHabits.map((h) =>
          h.category ? h : { ...h, category: 'other' },
        )

        if (savedDate !== today) {
          const wasComplete =
            parsedHabits.length > 0 && parsedHabits.every((h) => h.done)

          if (savedDate) {
            const percent =
              parsedHabits.length === 0
                ? 0
                : Math.round(
                    (parsedHabits.filter((h) => h.done).length /
                      parsedHabits.length) *
                      100,
                  )
            await saveDayStat(savedDate, percent)
          }

          const currentStreak = savedStreak ? parseInt(savedStreak) : 0
          const newStreak = wasComplete ? currentStreak + 1 : 0
          setStreak(newStreak)
          await AsyncStorage.setItem('streak', String(newStreak))

          parsedHabits = parsedHabits.map((h) => ({ ...h, done: false }))
          await AsyncStorage.setItem('lastDate', today)
        } else {
          setStreak(savedStreak ? parseInt(savedStreak) : 0)
        }

        setHabits(parsedHabits)
      } else {
        const now = Date.now()
        const defaults = [
          {
            id: `${now}1`,
            name: '💧 Пить воду',
            done: false,
            category: 'health',
          },
          {
            id: `${now}2`,
            name: '📚 Читать книгу',
            done: false,
            category: 'study',
          },
          {
            id: `${now}3`,
            name: '🏃 Тренировка',
            done: false,
            category: 'sport',
          },
        ]
        setHabits(defaults)
        await AsyncStorage.setItem('habits', JSON.stringify(defaults))
        await AsyncStorage.setItem('lastDate', today)
      }
    } catch (e) {
      console.log(e)
    } finally {
      isLoaded.current = true
    }
  }

  const saveDayStat = async (dateStr, percent) => {
    try {
      const raw = await AsyncStorage.getItem('weekStats')
      let stats = raw ? JSON.parse(raw) : []
      stats = stats.filter((s) => s.date !== dateStr)
      stats.push({ date: dateStr, percent })
      if (stats.length > 7) stats = stats.slice(stats.length - 7)
      await AsyncStorage.setItem('weekStats', JSON.stringify(stats))
    } catch (e) {
      console.log(e)
    }
  }

  const loadWeekStats = async () => {
    try {
      const raw = await AsyncStorage.getItem('weekStats')
      setWeekStats(raw ? JSON.parse(raw) : [])
    } catch (e) {
      console.log(e)
    }
  }

  // ── Habit actions ─────────────────────────────────────────

  const addHabit = () => {
    if (newHabit.trim() === '') return
    const habit = {
      id: Date.now().toString(),
      name: newHabit.trim(),
      done: false,
      category: newCategory,
    }
    setHabits([...habits, habit])
    setNewHabit('')
  }

  const deleteHabit = (id) => setHabits(habits.filter((h) => h.id !== id))

  const toggleHabit = (id) =>
    setHabits(habits.map((h) => (h.id === id ? { ...h, done: !h.done } : h)))

  const editHabit = (id) => {
    const habit = habits.find((h) => h.id === id)
    Alert.prompt(
      'Редактирование привычки',
      'Введите новое название',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сохранить',
          onPress: (text) => {
            if (!text || text.trim() === '') return
            setHabits(
              habits.map((h) =>
                h.id === id ? { ...h, name: text.trim() } : h,
              ),
            )
          },
        },
      ],
      'plain-text',
      habit.name,
    )
  }

  // ── Derived data ──────────────────────────────────────────

  const filteredHabits =
    activeCategory === 'all'
      ? habits
      : habits.filter((h) => h.category === activeCategory)

  const completedCount = habits.filter((h) => h.done).length
  const progress =
    habits.length === 0 ? 0 : Math.round((completedCount / habits.length) * 100)

  const getCategoryInfo = (id) =>
    CATEGORIES.find((c) => c.id === id) || CATEGORIES[4]

  // ── Chart helpers ─────────────────────────────────────────

  const getDayLabel = (dateStr) => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    return days[new Date(dateStr).getDay()]
  }

  const getChartData = () => {
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toDateString()
      if (i === 0) {
        result.push({ label: 'Сег', percent: progress, isToday: true })
      } else {
        const stat = weekStats.find((s) => s.date === dateStr)
        result.push({
          label: getDayLabel(dateStr),
          percent: stat ? stat.percent : null,
          isToday: false,
        })
      }
    }
    return result
  }

  // ── Render: Category picker modal ────────────────────────

  const renderCategoryModal = () => (
    <Modal
      transparent
      animationType="fade"
      visible={showCategoryModal}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={() => setShowCategoryModal(false)}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: SCREEN_WIDTH - 60,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
            Выберите категорию
          </Text>
          {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                setNewCategory(cat.id)
                setShowCategoryModal(false)
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 12,
                marginBottom: 8,
                backgroundColor: newCategory === cat.id ? '#E8F5E9' : '#f5f5f5',
              }}
            >
              <Text style={{ fontSize: 22, marginRight: 12 }}>{cat.emoji}</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: newCategory === cat.id ? 'bold' : 'normal',
                  color: newCategory === cat.id ? '#4CAF50' : '#333',
                }}
              >
                {cat.label}
              </Text>
              {newCategory === cat.id && (
                <Text style={{ marginLeft: 'auto', color: '#4CAF50' }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  )

  // ── Render: Home ──────────────────────────────────────────

  const renderHome = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#f5f5f5',
          paddingTop: 70,
          paddingHorizontal: 20,
        }}
      >
        {/* Заголовок */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>
            Трекер привычек
          </Text>
          <TouchableOpacity
            onPress={() => {
              loadWeekStats()
              setScreen('stats')
            }}
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
              📊
            </Text>
          </TouchableOpacity>
        </View>

        {/* Поле ввода + кнопка категории */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TextInput
            placeholder="Введите привычку..."
            value={newHabit}
            onChangeText={setNewHabit}
            style={{
              flex: 1,
              backgroundColor: 'white',
              padding: 15,
              borderRadius: 15,
              fontSize: 16,
            }}
          />
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            style={{
              backgroundColor: 'white',
              paddingHorizontal: 14,
              borderRadius: 15,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>
              {getCategoryInfo(newCategory).emoji}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={addHabit}
          style={{
            backgroundColor: '#4CAF50',
            padding: 18,
            borderRadius: 15,
            marginBottom: 18,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            + Добавить привычку
          </Text>
        </TouchableOpacity>

        {/* Фильтр по категориям */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  activeCategory === cat.id ? '#4CAF50' : 'white',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: activeCategory === cat.id ? 'bold' : 'normal',
                  color: activeCategory === cat.id ? 'white' : '#333',
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Список привычек */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {filteredHabits.length === 0 && (
            <Text
              style={{
                textAlign: 'center',
                color: '#aaa',
                marginTop: 30,
                fontSize: 16,
              }}
            >
              Нет привычек в этой категории
            </Text>
          )}
          {filteredHabits.map((habit) => {
            const cat = getCategoryInfo(habit.category)
            return (
              <TouchableOpacity
                key={habit.id}
                onPress={() => toggleHabit(habit.id)}
                style={{
                  backgroundColor: habit.done ? '#C8E6C9' : 'white',
                  padding: 20,
                  borderRadius: 15,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20 }}>
                      {habit.done ? '✅ ' : ''}
                      {habit.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      {cat.emoji} {cat.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => editHabit(habit.id)}>
                      <Text style={{ fontSize: 22 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteHabit(habit.id)}>
                      <Text style={{ fontSize: 22 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Прогресс */}
        <View
          style={{
            paddingVertical: 15,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            backgroundColor: '#f5f5f5',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Прогресс дня</Text>
          <Text
            style={{
              fontSize: 18,
              marginTop: 10,
              color: '#FF9800',
              fontWeight: 'bold',
            }}
          >
            🔥 Серия дней: {streak}
          </Text>
          <Text style={{ fontSize: 18, marginTop: 10 }}>
            Выполнено: {completedCount}/{habits.length}
          </Text>
          <Text
            style={{
              fontSize: 18,
              marginTop: 10,
              color: '#4CAF50',
              fontWeight: 'bold',
            }}
          >
            Прогресс: {progress}%
          </Text>
        </View>

        {renderCategoryModal()}
      </View>
    </TouchableWithoutFeedback>
  )

  // ── Render: Stats ─────────────────────────────────────────

  const renderStats = () => {
    const chartData = getChartData()
    const BAR_WIDTH = (SCREEN_WIDTH - 40 - 6 * 8) / 7
    const MAX_HEIGHT = 160

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f5f5f5' }}
        contentContainerStyle={{
          paddingTop: 70,
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 30,
          }}
        >
          <TouchableOpacity
            onPress={() => setScreen('home')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Статистика</Text>
        </View>

        {/* Карточки */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 25 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 32 }}>🔥</Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#FF9800',
                marginTop: 4,
              }}
            >
              {streak}
            </Text>
            <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              Серия дней
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 32 }}>📈</Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#4CAF50',
                marginTop: 4,
              }}
            >
              {weekStats.length === 0
                ? `${progress}%`
                : `${Math.round((weekStats.reduce((s, d) => s + d.percent, 0) + progress) / (weekStats.length + 1))}%`}
            </Text>
            <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              Среднее за неделю
            </Text>
          </View>
        </View>

        {/* График */}
        <View
          style={{ backgroundColor: 'white', borderRadius: 16, padding: 20 }}
        >
          <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 20 }}>
            Выполнение за 7 дней
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: MAX_HEIGHT + 30,
            }}
          >
            {chartData.map((item, index) => {
              const barH =
                item.percent !== null
                  ? Math.max((item.percent / 100) * MAX_HEIGHT, 4)
                  : 0
              const isEmpty = item.percent === null
              return (
                <View
                  key={index}
                  style={{ alignItems: 'center', width: BAR_WIDTH }}
                >
                  {!isEmpty ? (
                    <Text
                      style={{
                        fontSize: 11,
                        color: item.isToday ? '#4CAF50' : '#555',
                        fontWeight: item.isToday ? 'bold' : 'normal',
                        marginBottom: 4,
                      }}
                    >
                      {item.percent}%
                    </Text>
                  ) : (
                    <Text
                      style={{ fontSize: 11, color: '#ccc', marginBottom: 4 }}
                    >
                      —
                    </Text>
                  )}
                  <View
                    style={{
                      width: BAR_WIDTH,
                      height: isEmpty ? 4 : barH,
                      backgroundColor: isEmpty
                        ? '#e0e0e0'
                        : item.isToday
                          ? '#4CAF50'
                          : item.percent >= 80
                            ? '#81C784'
                            : item.percent >= 50
                              ? '#FFB74D'
                              : '#EF9A9A',
                      borderRadius: 6,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      marginTop: 6,
                      color: item.isToday ? '#4CAF50' : '#555',
                      fontWeight: item.isToday ? 'bold' : 'normal',
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              )
            })}
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 16,
              marginTop: 16,
            }}
          >
            {[
              { color: '#81C784', label: '≥80%' },
              { color: '#FFB74D', label: '≥50%' },
              { color: '#EF9A9A', label: '<50%' },
            ].map((l) => (
              <View
                key={l.label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: l.color,
                  }}
                />
                <Text style={{ fontSize: 12, color: '#777' }}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* По категориям */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginTop: 16,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 12 }}>
            По категориям сегодня
          </Text>
          {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
            const catHabits = habits.filter((h) => h.category === cat.id)
            if (catHabits.length === 0) return null
            const done = catHabits.filter((h) => h.done).length
            return (
              <View key={cat.id} style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>
                    {cat.emoji} {cat.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: '#4CAF50',
                      fontWeight: 'bold',
                    }}
                  >
                    {done}/{catHabits.length}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    backgroundColor: '#f0f0f0',
                    borderRadius: 4,
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#4CAF50',
                      width: `${catHabits.length === 0 ? 0 : Math.round((done / catHabits.length) * 100)}%`,
                    }}
                  />
                </View>
              </View>
            )
          })}
        </View>

        {/* Сегодня */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginTop: 16,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 12 }}>
            Сегодня
          </Text>
          {habits.map((h) => (
            <View
              key={h.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>
                {h.done ? '✅' : '⬜️'}
              </Text>
              <Text
                style={{ fontSize: 16, color: h.done ? '#4CAF50' : '#333' }}
              >
                {h.name}
              </Text>
            </View>
          ))}
          {habits.length === 0 && (
            <Text style={{ color: '#aaa' }}>Нет привычек</Text>
          )}
        </View>
      </ScrollView>
    )
  }

  return screen === 'home' ? renderHome() : renderStats()
}
