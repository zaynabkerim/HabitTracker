import { supabase } from './supabaseClient.js'

// загрузка объектов в dropdown
async function loadObjects() {
  const { data, error } = await supabase.from('objects').select('*')

  const select = document.getElementById('object')
  select.innerHTML = ''

  data.forEach((obj) => {
    const option = document.createElement('option')
    option.value = obj.id
    option.textContent = obj.address
    select.appendChild(option)
  })
}

// создание сделки
async function addDeal() {
  const object_id = parseInt(document.getElementById('object').value)
  const price = parseInt(document.getElementById('price').value)

  const { error } = await supabase.from('deals').insert([{ object_id, price }])

  if (error) {
    console.error(error)
  } else {
    alert('Сделка создана')
    loadDeals()
  }
}

// загрузка сделок
async function loadDeals() {
  const { data, error } = await supabase.from('deals').select(`
      *,
      objects (address)
    `)

  const list = document.getElementById('list')
  list.innerHTML = ''

  data.forEach((deal) => {
    const li = document.createElement('li')
    li.textContent = deal.objects.address + ' — ' + deal.price
    list.appendChild(li)
  })
}

document.getElementById('addDealBtn').addEventListener('click', addDeal)

loadObjects()
loadDeals()
