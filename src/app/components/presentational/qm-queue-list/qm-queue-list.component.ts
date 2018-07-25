import { Subscription } from 'rxjs';
import { Queue } from './../../../../models/IQueue';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { QueueSelectors, QueueDispatchers, BranchSelectors } from 'src/store';
import { IBranch } from '../../../../models/IBranch';

@Component({
  selector: 'qm-queue-list',
  templateUrl: './qm-queue-list.component.html',
  styleUrls: ['./qm-queue-list.component.scss']
})
export class QmQueueListComponent implements OnInit, OnDestroy {

  queueCollection = new Array<Queue>();

  private subscriptions: Subscription = new Subscription();
  private queuePoll = null;
  private selectedBranch: IBranch;
  private queuePollIntervl = 60;
  sortAscending = true;

  constructor(
    private queueSelectors: QueueSelectors,
    private queueDispatchers: QueueDispatchers,
    private branchSelectors: BranchSelectors
  ) {

  }

  ngOnInit() {
    const queueListSubscription = this.queueSelectors.queueSummary$.subscribe((qs) => {
      this.queueCollection = qs.queues;
    })
    this.subscriptions.add(queueListSubscription);

    const branchSubscription = this.branchSelectors.selectedBranch$.subscribe((branch) => {
      if (branch) {
        this.selectedBranch = branch;
        this.queueDispatchers.fetchQueueInfo(branch.id);
        this.setQueuePoll();
      }
    });
    this.subscriptions.add(branchSubscription);
  }

  setQueuePoll() {
    if (this.queuePoll) {
      clearInterval(this.queuePoll);
    }
    this.queuePoll = setInterval(() => {
      this.queueDispatchers.fetchQueueInfo(this.selectedBranch.id);
    }, this.queuePollIntervl * 1000);
  }

  ngOnDestroy() {
    if (this.queuePoll) {
      clearInterval(this.queuePoll);
    }
    this.subscriptions.unsubscribe();
  }

  sortQueueList() {
    this.sortAscending = !this.sortAscending;
    if (this.queueCollection) {
      // sort by name
      this.queueCollection = this.queueCollection.sort((a, b) => {
        var nameA = a.queue.toUpperCase(); // ignore upper and lowercase
        var nameB = b.queue.toUpperCase(); // ignore upper and lowercase
        if ((nameA < nameB && this.sortAscending) || (nameA > nameB && !this.sortAscending) ) {
          return -1;
        }
        if ((nameA > nameB && this.sortAscending) || (nameA < nameB && !this.sortAscending)) {
          return 1;
        }

        // names must be equal
        return 0;
      });
    }

  }
}
