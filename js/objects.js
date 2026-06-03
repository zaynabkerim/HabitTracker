console.log('JS Подключился')
import { supabase } from './supabaseClient.js'

async function loadObjects() {
  const { data, error } = await supabase.from('objects').select(`
    *,
    property_types (name)
  `)

  if (error) {
    console.error(error)
    return
  }

  const list = document.getElementById('list')
  list.innerHTML = ''

  data.forEach((obj) => {
    const li = document.createElement('li')
    li.textContent =
      obj.address +
      ' — ' +
      obj.price +
      ' — ' +
      (obj.property_types?.name || 'Без типа')
    list.appendChild(li)
  })
}

async function loadTypes() {
  const { data, error } = await supabase.from('property_types').select('*')

  console.log('типы:', data)

  if (error) {
    console.error(error)
    return
  }

  const select = document.getElementById('type')
  select.innerHTML = '<option value="">Выбери тип</option>'

  data.forEach((type) => {
    const option = document.createElement('option')
    option.value = type.id
    option.textContent = type.name
    select.appendChild(option)
  })
}

async function addObject() {
  console.log('кнопка нажалась')

  const address = document.getElementById('address').value
  const price = document.getElementById('price').value
  const type_id = parseInt(document.getElementById('type').value)

  console.log('данные:', address, price, type_id)

  if (!address || !price || !type_id) {
    alert('Заполни все поля')
    return
  }

  const { error } = await supabase
    .from('objects')
    .insert([{ address, price, type_id }])

  if (error) {
    console.error(error)
  } else {
    alert('Добавлено!')
    loadObjects()
  }
}

window.addObject = addObject

loadObjects()
loadTypes()
document.getElementById('addBtn').addEventListener('click', addObject)
