export const convertTime = (time: string) => {
  const parts = time.split(':')
  let suffix = 'am'
  if (Number(parts[0]) > 12) {
    suffix = 'pm'
    parts[0] = (Number(parts[0]) - 12).toString()
  }
  if (parts[0].length < 2) {
    parts[0] = `0${parts[0]}`
  }
  if (parts[1].length < 2) {
    parts[1] = `0${parts[1]}`
  }
  return `${parts.join(':')}${suffix}`
}

export const convertDate = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export const convertTime2 = (date: Date) => {
  return `${convertTime(`${date.getHours()}:${date.getMinutes()}`)}`
}

export const convertDate2 = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`
}
