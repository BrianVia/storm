import {Component} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, forkJoin, Observable, of, timer} from 'rxjs';
import {catchError, filter, mergeMap, switchMap, debounceTime, distinctUntilChanged, skip} from 'rxjs/operators';
import {ApiService, DiskSpace, Hash, SessionStatus, State, Torrent, ViewTorrent} from './api.service';
import {SelectItem} from 'primeng/api';
import {FocusService} from './focus.service';
import {DialogService} from 'primeng/dynamicdialog';
import {PluginEnableComponent} from './components/plugin-enable/plugin-enable.component';
import {ActivatedRoute, Router} from '@angular/router';

type OptionalState = State | null;


@Component({
  selector: 't-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private _searchText$ = new BehaviorSubject<string>('');
  private _sortByField$ = new BehaviorSubject<keyof Torrent>(null);
  private _sortReverse$ = new BehaviorSubject<boolean>(false);

  get searchText(): string {
    return this._searchText$.value;
  }

  set searchText(value: string) {
    this._searchText$.next(value || '');
  }

  get sortByField(): keyof Torrent {
    return this._sortByField$.value;
  }

  set sortByField(value: keyof Torrent) {
    this._sortByField$.next(value);
  }

  get sortReverse(): boolean {
    return this._sortReverse$.value;
  }

  set sortReverse(value: boolean) {
    this._sortReverse$.next(value);
  }

  sortOptions: SelectItem<keyof Torrent>[] = [
    {
      label: 'State',
      value: 'State'
    },
    {
      label: 'Added',
      value: 'TimeAdded'
    },
    {
      label: 'Progress',
      value: 'Progress'
    },
    {
      label: 'ETA',
      value: 'ETA'
    },
    {
      label: 'Name',
      value: 'Name'
    },
    {
      label: 'Size',
      value: 'TotalSize'
    },
    {
      label: 'Ratio',
      value: 'Ratio'
    },
    {
      label: 'Seeding',
      value: 'SeedingTime'
    }
  ];

  filterStatesOptions: SelectItem<OptionalState>[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'Active',
      value: 'Active'
    },
    {
      label: 'Queued',
      value: 'Queued',
    },
    {
      label: 'Downloading',
      value: 'Downloading',
    },
    {
      label: 'Seeding',
      value: 'Seeding',
    },
    {
      label: 'Paused',
      value: 'Paused'
    },
    {
      label: 'Error',
      value: 'Error'
    }
  ];

  // All torrent hashes within the current view
  hashesInView: string[];
  // Current view is empty
  empty = false;
  stateInView: OptionalState;
  sessionStatus: SessionStatus = {
    HasIncomingConnections: false,
    UploadRate: 0,
    DownloadRate: 0,
    PayloadUploadRate: 0,
    PayloadDownloadRate: 0,
    TotalDownload: 0,
    TotalUpload: 0,
    NumPeers: 0,
    DhtNodes: 0,
  };
  diskSpace: DiskSpace;

  torrents: ViewTorrent[];

  connected = true;
  lastEtag: string;

  get$: BehaviorSubject<OptionalState>;

  constructor(
    private api: ApiService,
    private focus: FocusService,
    private dialogService: DialogService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.get$ = new BehaviorSubject<OptionalState>(null);
    this.initializeFromUrl();
    this.syncStateToUrl();
    this.refreshInterval(2000);
  }

  /**
   * Initialize component state from URL query parameters
   */
  private initializeFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    // Initialize search text
    if (params['q']) {
      this.searchText = params['q'];
    }

    // Initialize filter state
    if (params['filter']) {
      const filterValue = params['filter'] as State;
      const isValidState = this.filterStatesOptions.some(opt => opt.value === filterValue);
      if (isValidState) {
        this.get$.next(filterValue);
      }
    }

    // Initialize sort field
    if (params['sort']) {
      const sortValue = params['sort'] as keyof Torrent;
      const isValidSort = this.sortOptions.some(opt => opt.value === sortValue);
      if (isValidSort) {
        this.sortByField = sortValue;
      }
    }

    // Initialize sort direction
    if (params['reverse']) {
      this.sortReverse = params['reverse'] === 'true';
    }
  }

  /**
   * Sync component state changes to URL query parameters
   */
  private syncStateToUrl(): void {
    // Combine all state observables and update URL
    combineLatest([
      this._searchText$.pipe(distinctUntilChanged(), debounceTime(300)),
      this.get$.pipe(distinctUntilChanged()),
      this._sortByField$.pipe(distinctUntilChanged()),
      this._sortReverse$.pipe(distinctUntilChanged())
    ]).pipe(
      skip(1) // Skip initial emission to avoid overwriting URL on load
    ).subscribe(([search, filterState, sortField, reverse]) => {
      this.updateUrl(search, filterState, sortField, reverse);
    });
  }

  /**
   * Update URL with current state
   */
  private updateUrl(search: string, filterState: OptionalState, sortField: keyof Torrent, reverse: boolean): void {
    const queryParams: any = {};

    if (search) {
      queryParams.q = search;
    }

    if (filterState) {
      queryParams.filter = filterState;
    }

    if (sortField) {
      queryParams.sort = sortField;
    }

    if (reverse) {
      queryParams.reverse = 'true';
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }


  /**
   * Opens the PluginEnable dialog component
   * @private
   */
  private enableLabelPlugin(): Observable<void> {
    const ref = this.dialogService.open(PluginEnableComponent, {
      header: 'Enable Plugin',
      showHeader: false,
      closable: false,
      closeOnEscape: false,
      dismissableMask: false,
      styleClass: 't-dialog-responsive',
      data: {
        name: 'Label'
      }
    });

    return ref.onClose;
  }

  /**
   * Updates the list of torrents at every given interval,
   * or when the selected $get state is updated.
   * @param interval
   * Update interval in milliseconds
   */
  private refreshInterval(interval: number): void {
    const timer$ = timer(0, interval);

    // Ensure the label plugin is enabled
    const labelPluginEnabled$ = this.api.plugins().pipe(
      switchMap(plugins => {
        const ok = plugins.findIndex(name => name === 'Label') > -1;
        if (ok) {
          return of(true);
        }

        return this.enableLabelPlugin();
      })
    );

    const interval$ = combineLatest([timer$, this.focus.observe, this.get$, labelPluginEnabled$]);

    interval$.pipe(
      // Continue only when in focus
      filter(([_, focus]) => focus),

      // Switch to API response of torrents
      mergeMap(([_, focus, state]) => this.api.viewUpdate(this.lastEtag, state).pipe(
        catchError(err => {
          console.error('Connection error', err);
          this.connected = false;
          this.lastEtag = null;
          return EMPTY;
        }),
      )),
    ).subscribe(
      response => {
        this.connected = true;
        this.sessionStatus = response.Session;
        this.diskSpace = {FreeBytes: response.DiskFree};
        this.torrents = response.Torrents;

        this.empty = this.torrents.length === 0;
        this.hashesInView = this.torrents.map(t => t.Hash);
        this.lastEtag = response.ETag;

        const statesInView = new Set(this.torrents.map(t => t.State));
        const [onlyStateInView] = statesInView.size === 1 ? statesInView : [];
        this.stateInView = onlyStateInView || null;
      }
    );
  }

  public trackBy(index: number, torrent: Hash): string {
    return torrent.Hash;
  }


  onToggleInView(targetState: 'pause' | 'resume', torrents: ViewTorrent[]): void {
    if (!torrents || torrents.length === 0) {
      return;
    }

    let res: Observable<void>;
    switch (targetState) {
      case 'pause':
        res = this.api.pause(...torrents.filter(t => t.State !== 'Paused').map(t => t.Hash));
        break;
      case 'resume':
        res = this.api.resume(...torrents.filter(t => t.State === 'Paused').map(t => t.Hash));
        break;
    }

    res.subscribe(
      _ => console.log(`torrents in view reached target state ${targetState}`)
    );
  }
}
