fetch('../data/data.json')
  .then(response => response.json())
  .then(data => {
    displayTopArtists(data);
    displayGenreDistribution(data);
    populateSongsTable(data);
    setupSearch();
    setupSorting();
    document.getElementById('songCount').textContent = data.length;
    setupModalListener(data);
    generatePopularAlbums(data);
  })
  .catch(error => console.error('Erreur de chargement JSON:', error));

function displayTopArtists(data) {
  const artistCounts = data.flatMap(track => track.artists.map(a => a.name))
    .reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  new Chart(document.getElementById('topArtistsChart'), {
    type: 'bar',
    data: {
      labels: topArtists.map(([name]) => name),
      datasets: [{
        label: 'Nombre de mentions',
        data: topArtists.map(([, count]) => count),
        backgroundColor: 'rgba(55, 150, 214, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          display: false // <== Légende désactivée ici
        }
      },
      indexAxis: 'y',
      responsive: true,
      scales: { x: { beginAtZero: true }, y: { beginAtZero: true } }
    }
  });
}

function displayGenreDistribution(data) {
  const allGenres = data.flatMap(track =>
    track.artists.flatMap(a => a.genres || [])
  );

  const genreCounts = allGenres.reduce((acc, genre) => {
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {});

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenres = sortedGenres.slice(0, 7);
  const otherTotal = sortedGenres.slice(7).reduce((sum, [, n]) => sum + n, 0);

  new Chart(document.getElementById('genreDistributionChart'), {
    type: 'pie',
    data: {
      labels: [...topGenres.map(([g]) => g), 'Autres'],
      datasets: [{
        label: 'Genres musicaux',
        data: [...topGenres.map(([, n]) => n), otherTotal],
        backgroundColor: [
          '#1ABC9C', '#E74C3C', '#2ECC71', '#9B59B6',
          '#F1C40F', '#34495E', '#E67E22', '#7F8C8D'
        ],
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: {
            usePointStyle: true,
            padding: 20,
          }
        }
      }
    }
  });
}

function populateSongsTable(data) {
  const tbody = document.getElementById('songsTableBody');
  tbody.innerHTML = '';

  data.forEach(track => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${track.name}</td>
      <td>${track.artists.map(a => a.name).join(', ')}</td>
      <td>${track.album?.name || ''}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary details-btn" data-bs-toggle="modal" data-bs-target="#songDetailModal" data-song-id="${track.id}">
          <i class="bi bi-info-circle"></i> Détails
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function setupModalListener(tracks) {
  const modal = document.getElementById('songDetailModal');
  modal.addEventListener('show.bs.modal', event => {
    const btn = event.relatedTarget;
    const trackId = btn.getAttribute('data-song-id');
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    document.getElementById('modalSongTitle').textContent = track.name;
    document.getElementById('modalSongDuration').textContent = formatDuration(track.duration_ms);
    document.getElementById('modalSongPopularity').textContent = track.popularity || 0;
    document.getElementById('modalTrackNumber').textContent = track.track_number || 1;
    document.getElementById('modalExplicit').textContent = track.explicit ? 'Oui' : 'Non';

    const albumImg = track.album?.images?.[0]?.url || 'https://via.placeholder.com/300';
    const albumName = track.album?.name || 'album';
    const modalAlbumImage = document.getElementById('modalAlbumImage');
    modalAlbumImage.src = albumImg;
    modalAlbumImage.alt = `${albumName}-cover`;

    document.getElementById('modalReleaseDate').textContent = formatDate(track.album?.release_date);
    document.getElementById('modalAlbumPopularity').textContent = `Popularité: ${track.album?.popularity || 0}/100`;

    const audio = document.getElementById('modalAudioPreview');
    if (track.preview_url) {
      audio.src = track.preview_url;
      audio.style.display = 'block';
    } else {
      audio.style.display = 'none';
    }

    const artistsList = document.getElementById('modalArtistsList');
    artistsList.innerHTML = '<strong>Artistes :</strong>';
    const ul = document.createElement('ul');
    ul.className = 'list-unstyled mt-1';

    track.artists.forEach(artist => {
      const li = document.createElement('li');
      li.className = 'd-flex align-items-center mb-2';
      const imgSrc = artist.images?.[0]?.url || 'https://via.placeholder.com/30';

      li.innerHTML = `
        <img src="${imgSrc}" class="rounded-circle me-2" width="30" height="30" onerror="this.src='https://via.placeholder.com/30'" alt="${artist.name}">
        <div>
          <div>${artist.name}</div>
          <small class="text-muted">
            Popularité: ${artist.popularity || 0}/100
            ${artist.followers?.total ? ` • ${artist.followers.total} followers` : ''}
          </small>
        </div>
      `;
      ul.appendChild(li);
    });
    artistsList.appendChild(ul);

    const genreContainer = document.getElementById('modalGenres');
    genreContainer.innerHTML = '';
    const genres = track.album?.genres || [];
    if (genres.length > 0) {
      genres.forEach(g => {
        const span = document.createElement('span');
        span.className = 'badge bg-secondary me-1 mb-1';
        span.textContent = g;
        genreContainer.appendChild(span);
      });
    } else {
      genreContainer.textContent = 'Aucun genre disponible';
    }

    const spotifyLink = document.getElementById('modalSpotifyLink');
    if (track.external_urls?.spotify) {
      spotifyLink.href = track.external_urls.spotify;
      spotifyLink.style.display = 'inline-block';
    } else {
      spotifyLink.style.display = 'none';
    }
  });
}

function generatePopularAlbums(data) {
  const albumsMap = {};

  data.forEach(track => {
    const album = track.album;
    if (!album?.id) return;

    if (!albumsMap[album.id]) {
      albumsMap[album.id] = {
        id: album.id,
        name: album.name,
        images: album.images,
        release_date: album.release_date,
        popularity: album.popularity || 0,
        trackCount: 0,
        artistNames: []
      };
    }
    albumsMap[album.id].trackCount++;
    track.artists.forEach(a => {
      if (!albumsMap[album.id].artistNames.includes(a.name)) {
        albumsMap[album.id].artistNames.push(a.name);
      }
    });
  });

  const topAlbums = Object.values(albumsMap)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12);

  const container = document.getElementById('popularAlbums');
  container.innerHTML = '';

  topAlbums.forEach(album => {
    const col = document.createElement('div');
    col.className = 'col';

    const card = document.createElement('div');
    card.className = 'card h-100 shadow-sm';

    const img = document.createElement('img');
    img.className = 'card-img-top';
    img.style.height = '200px';
    img.style.objectFit = 'cover';
    img.src = album.images?.[0]?.url || 'https://via.placeholder.com/300';
    img.alt = `${album.name}-cover`;

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h6');
    title.className = 'card-title text-truncate';
    title.title = album.name;
    title.textContent = album.name;

    const artists = document.createElement('p');
    artists.className = 'card-text text-truncate mb-1';
    artists.textContent = album.artistNames.join(', ');

    const releaseDate = document.createElement('p');
    releaseDate.className = 'card-text text-muted';
    releaseDate.textContent = formatDate(album.release_date);

    body.appendChild(title);
    body.appendChild(artists);
    body.appendChild(releaseDate);

    card.appendChild(img);
    card.appendChild(body);

    col.appendChild(card);
    container.appendChild(col);
  });
}

function setupSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    const searchTerm = input.value.toLowerCase();
    filterSongs(searchTerm);
  });
}

function filterSongs(searchTerm) {
  const rows = document.querySelectorAll('#songsTableBody tr');
  let visibleCount = 0;

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const match = Array.from(cells).some(td => td.textContent.toLowerCase().includes(searchTerm));
    if (match) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  document.getElementById('songCount').textContent = visibleCount;
}

function setupSorting() {
  const headers = document.querySelectorAll('th.sortable');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const sortBy = header.getAttribute('data-sort');
      sortSongsTable(sortBy);
    });
  });
}

let sortDirection = {};

function sortSongsTable(sortBy) {
  const tbody = document.getElementById('songsTableBody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  sortDirection[sortBy] = !sortDirection[sortBy]; // toggle asc/desc
  const direction = sortDirection[sortBy] ? 1 : -1;

  rows.sort((a, b) => {
    const aText = a.querySelector(`td:nth-child(${getColumnIndex(sortBy)})`).textContent.toLowerCase();
    const bText = b.querySelector(`td:nth-child(${getColumnIndex(sortBy)})`).textContent.toLowerCase();
    return aText.localeCompare(bText) * direction;
  });

  tbody.innerHTML = '';
  rows.forEach(row => tbody.appendChild(row));
}

function getColumnIndex(sortBy) {
  switch(sortBy) {
    case 'titre': return 1;
    case 'artiste': return 2;
    case 'album': return 3;
    default: return 1;
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR');
}
