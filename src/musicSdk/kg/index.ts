import musicSearch from './musicSearch'
import lyric from './lyric'
import songList from './songList'
import leaderboard from './leaderboard'

const kg = {
  musicSearch,
  leaderboard,
  songList,
  getLyric(songInfo: any) {
    return lyric.getLyric(songInfo)
  },
}

export default kg
